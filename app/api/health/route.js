// Bilan de santé public (aucune donnée sensible) — consulté par la surveillance hebdomadaire.
export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const out = { ok: true, checkedAt: new Date().toISOString(), linkedin: {}, problems: [] };

  // 1. Jeton LinkedIn valide ?
  if (!token) {
    out.linkedin.tokenPresent = false;
    out.problems.push("LINKEDIN_ACCESS_TOKEN absent");
  } else {
    out.linkedin.tokenPresent = true;
    try {
      const r = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      out.linkedin.tokenValid = r.ok;
      if (!r.ok) out.problems.push(`Jeton LinkedIn refusé (HTTP ${r.status}) — renouveler via /api/linkedin/auth`);
    } catch (e) {
      out.linkedin.tokenValid = null;
      out.problems.push(`LinkedIn injoignable : ${e.message}`);
    }
  }

  // 2. Date d'expiration (écrite par le callback lors du renouvellement)
  const exp = process.env.LINKEDIN_TOKEN_EXPIRES_AT;
  if (exp) {
    const days = Math.round((new Date(exp) - Date.now()) / 86400000);
    out.linkedin.expiresAt = exp;
    out.linkedin.daysLeft = days;
    if (days <= 10) out.problems.push(`Jeton LinkedIn expire dans ${days} jour(s) (${exp.slice(0, 10)})`);
  } else {
    out.linkedin.expiresAt = null;
  }

  // 3. Clé Anthropic présente
  if (!process.env.ANTHROPIC_API_KEY) out.problems.push("ANTHROPIC_API_KEY absente");

  out.ok = out.problems.length === 0;
  return Response.json(out, { status: out.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
