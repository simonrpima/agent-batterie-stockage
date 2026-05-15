import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = "https://agent-batterie-stockage.vercel.app/api/linkedin/callback";

  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    return NextResponse.json({ error: "Token exchange failed", details: tokenData }, { status: 400 });
  }

  return NextResponse.json({
    message: "✅ Authentification réussie !",
    access_token: tokenData.access_token,
    expires_in: tokenData.expires_in,
    instruction: "Copiez access_token dans Vercel : LINKEDIN_ACCESS_TOKEN"
  });
}
