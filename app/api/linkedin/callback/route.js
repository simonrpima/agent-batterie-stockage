export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  if (error) {
    return new Response(
      `<html><body style="font-family:sans-serif;padding:2rem">
        <h2>❌ Erreur LinkedIn OAuth</h2>
        <p><strong>${error}</strong> — ${errorDesc}</p>
        <a href="/api/linkedin/auth">🔄 Réessayer</a>
      </body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code) {
    return Response.json({ error: "Code OAuth manquant" }, { status: 400 });
  }

  const redirectUri = "https://agent-batterie-stockage.vercel.app/api/linkedin/callback";

  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
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

  // Récupérer le profil pour vérification
  const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = profileRes.ok ? await profileRes.json() : {};

  return new Response(
    `<html><body style="font-family:monospace;padding:2rem;background:#f0fdf4">
      <h2 style="color:#16a34a">✅ Authentification réussie !</h2>
      ${profile.name ? `<p>👤 <strong>${profile.name}</strong> (${profile.email || ""})</p>` : ""}
      <p>⏱️ Token valide <strong>${expiresJours} jours</strong></p>
      <h3>🔑 Copie ce token dans Vercel → LINKEDIN_ACCESS_TOKEN :</h3>
      <textarea rows="5" style="width:100%;font-size:12px;padding:8px">${accessToken}</textarea>
      <br/><br/>
      <div style="background:#fef9c3;padding:1rem;border-radius:6px">
        <strong>⚠️ Étapes :</strong><br/>
        1. Copie le token ci-dessus<br/>
        2. Vercel → Settings → Environment Variables → <code>LINKEDIN_ACCESS_TOKEN</code> → Edit → Coller → Save<br/>
        3. Vercel → Deployments → Redeploy<br/>
        4. Teste : <a href="/api/linkedin/post">/api/linkedin/post</a>
      </div>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
