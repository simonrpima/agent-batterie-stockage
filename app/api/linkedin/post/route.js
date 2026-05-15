import { NextResponse } from "next/server";

const POST_TYPES = ["conseil", "offre", "conseil", "offre", "conseil", "offre"];

export async function GET() {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json({ error: "LINKEDIN_ACCESS_TOKEN manquant" }, { status: 500 });
  }

  const today = new Date();
  const weekNumber = Math.floor(today.getTime() / (7 * 24 * 60 * 60 * 1000));
  const postType = POST_TYPES[weekNumber % POST_TYPES.length];

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: postType === "conseil"
          ? `Rédige un post LinkedIn professionnel de 150-200 mots sur le stockage d'énergie solaire pour les installateurs photovoltaïques. Ton : expert, direct, utile. Inclure : un conseil pratique concret, 3-4 hashtags (#stockageenergie #photovoltaique #batteriesolaire #renouvelables). Terminer par : "👉 batterie-stockage.fr | 06 63 70 66 30". Pas de titre, juste le post.`
          : `Rédige un post LinkedIn professionnel de 150-200 mots présentant une offre produit de batterie de stockage Renon Power. Produits : Xcellent 5,12kWh 1190€ HT, Xcellent Plus 16kWh 2390€ HT, EBrick 5,12kWh 1090€ HT. Ton : commercial, direct, orienté installateurs Quali PV. Inclure : prix HT, livraison 48-72h France, stock disponible, 3-4 hashtags. Terminer par : "👉 batterie-stockage.fr | 06 63 70 66 30". Pas de titre, juste le post.`
      }],
    }),
  });

  const claudeData = await claudeRes.json();
  const postContent = claudeData.content?.[0]?.text;

  if (!postContent) {
    return NextResponse.json({ error: "Erreur génération contenu Claude" }, { status: 500 });
  }

  // Récupérer l'ID du membre via introspection du token
  const introspectRes = await fetch("https://api.linkedin.com/v2/introspectToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      token: accessToken,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    }),
  });
  const introspectData = await introspectRes.json();
  const memberId = introspectData.auth_type === "member" ? introspectData.member_id : null;

  if (!memberId) {
    return NextResponse.json({ error: "Impossible de récupérer le member_id", introspect: introspectData }, { status: 500 });
  }

  const linkedinRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: `urn:li:person:${memberId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: postContent },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  const linkedinData = await linkedinRes.json();

  return NextResponse.json({
    success: true,
    type: postType,
    post: postContent,
    linkedin: linkedinData,
  });
}
