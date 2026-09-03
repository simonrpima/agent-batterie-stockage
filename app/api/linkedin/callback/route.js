const REDIRECT_URI = "https://agent-batterie-stockage.vercel.app/api/linkedin/callback";
const ENV_KEY = "LINKEDIN_ACCESS_TOKEN";

function page(inner, status = 200) {
  return new Response(
    `<html><body style="font-family:monospace;padding:2rem;background:#f0fdf4;max-width:800px">${inner}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

// --- Vercel : met à jour LINKEDIN_ACCESS_TOKEN et redéploie la prod, sans passer par l'interface ---
async function vercel(path, init = {}) {
  const token = process.env.VERCEL_TOKEN;
  const team = process.env.VERCEL_TEAM_ID ? `${path.includes("?") ? "&" : "?"}teamId=${process.env.VERCEL_TEAM_ID}` : "";
  const res = await fetch(`https://api.vercel.com${path}${team}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${init.method || "GET"} ${path} → HTTP ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

async function upsertEnv(projectId, envs, key, value, type) {
  const existing = envs.find((e) => e.key === key);
  if (existing) {
    await vercel(`/v9/projects/${projectId}/env/${existing.id}`, { method: "PATCH", body: JSON.stringify({ value }) });
    return `Variable ${key} mise à jour`;
  }
  await vercel(`/v10/projects/${projectId}/env`, { method: "POST", body: JSON.stringify({ key, value, type, target: ["production", "preview"] }) });
  return `Variable ${key} créée`;
}

async function saveTokenToVercel(accessToken, expiresAtIso) {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!process.env.VERCEL_TOKEN || !projectId) return { done: false, reason: "VERCEL_TOKEN ou VERCEL_PROJECT_ID absent" };

  const steps = [];
  // 1. Variables existantes
  const { envs = [] } = await vercel(`/v9/projects/${projectId}/env`);

  // 2. Jeton (secret) + date d'expiration (lisible, pour /api/health)
  steps.push(await upsertEnv(projectId, envs, ENV_KEY, accessToken, "encrypted"));
  steps.push(await upsertEnv(projectId, envs, "LINKEDIN_TOKEN_EXPIRES_AT", expiresAtIso, "plain"));

  // 3. Redéployer la dernière prod pour que la nouvelle valeur soit prise en compte
  const project = await vercel(`/v9/projects/${projectId}`);
  const { deployments = [] } = await vercel(`/v6/deployments?projectId=${projectId}&target=production&state=READY&limit=1`);
  if (!deployments[0]) return { done: true, steps, redeploy: false, reason: "aucun déploiement prod trouvé" };
  const dep = await vercel(`/v13/deployments?forceNew=1`, {
    method: "POST",
    body: JSON.stringify({ name: project.name, deploymentId: deployments[0].uid, target: "production" }),
  });
  steps.push(`Redéploiement lancé : ${dep.url || dep.id}`);
  return { done: true, steps, redeploy: true, url: dep.url };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  if (error) {
    return page(`<h2 style="color:#dc2626">❌ Erreur LinkedIn OAuth</h2><p><strong>${error}</strong> — ${errorDesc}</p><a href="/api/linkedin/auth">🔄 Réessayer</a>`, 400);
  }
  if (!code) return Response.json({ error: "Code OAuth manquant" }, { status: 400 });

  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    }),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return Response.json({ error: "Échange token échoué", detail: err }, { status: 500 });
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  const expiresJours = Math.round(tokenData.expires_in / 86400);
  const expiresAtIso = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
  const expireLe = new Date(expiresAtIso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
  const profile = profileRes.ok ? await profileRes.json() : {};
  const who = profile.name ? `<p>👤 <strong>${profile.name}</strong> (${profile.email || ""})</p>` : "";

  // Tentative d'enregistrement automatique dans Vercel
  let auto;
  try { auto = await saveTokenToVercel(accessToken, expiresAtIso); }
  catch (e) { auto = { done: false, reason: e.message }; }

  if (auto.done) {
    return page(`
      <h2 style="color:#16a34a">✅ Jeton LinkedIn renouvelé et enregistré</h2>
      ${who}
      <p>⏱️ Valide <strong>${expiresJours} jours</strong> — expire le <strong>${expireLe}</strong>. Pense à revenir sur <code>/api/linkedin/auth</code> avant cette date.</p>
      <ul>${auto.steps.map((s) => `<li>${s}</li>`).join("")}</ul>
      ${auto.redeploy
        ? `<p>Le redéploiement prend ~30 s. Ensuite, la prochaine exécution Make publiera normalement.</p>`
        : `<p style="color:#b45309">⚠️ ${auto.reason} — fais un <em>Redeploy</em> manuel dans Vercel → Deployments.</p>`}
      <p style="color:#6b7280;font-size:12px">Le jeton n'est pas affiché : il est déjà stocké dans Vercel.</p>`);
  }

  // Repli : procédure manuelle (comportement d'origine)
  return page(`
    <h2 style="color:#16a34a">✅ Authentification réussie</h2>
    ${who}
    <p>⏱️ Valide <strong>${expiresJours} jours</strong> — expire le <strong>${expireLe}</strong></p>
    <p style="color:#b45309">⚠️ Enregistrement automatique impossible : ${auto.reason}</p>
    <h3>🔑 Copie ce token dans Vercel → ${ENV_KEY} :</h3>
    <textarea rows="5" style="width:100%;font-size:12px;padding:8px">${accessToken}</textarea>
    <div style="background:#fef9c3;padding:1rem;border-radius:6px;margin-top:1rem">
      <strong>Étapes :</strong><br/>
      1. Copie le token ci-dessus<br/>
      2. Vercel → Settings → Environment Variables → <code>${ENV_KEY}</code> → Edit → Coller → Save<br/>
      3. Vercel → Deployments → Redeploy<br/>
      4. Teste : <a href="/api/linkedin/post">/api/linkedin/post</a> (⚠️ publie un vrai post)
    </div>`);
}
