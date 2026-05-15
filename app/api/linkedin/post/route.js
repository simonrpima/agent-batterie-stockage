import Anthropic from "@anthropic-ai/sdk";

const TOPICS = [
  "Les avantages du stockage par batterie pour les particuliers : autoconsommation optimisée, indépendance du réseau, économies sur la facture EDF",
  "Batteries LFP vs NMC : pourquoi la technologie Lithium Fer Phosphate (Renon Power / Xcellent) est la plus sûre pour une installation résidentielle",
  "Tout savoir sur le raccordement batterie + panneaux solaires : AC-couplé vs DC-couplé, onduleurs hybrides",
  "ROI et rentabilité d'un système solaire + batterie en 2025 : chiffres réels, simulation pour une maison de 150 m²",
  "Les aides pour le stockage batterie en France : TVA 5,5%, CEE, aides régionales — ce qui existe vraiment",
  "Batteries Xcellent vs Xtreme LV vs EBrick de Renon Power : comment choisir la bonne capacité",
  "Installateur Quali PV 500 kWc : ce que ça signifie pour la qualité de votre installation solaire",
  "Durée de vie, garantie, maintenance, recyclage des batteries LFP : les vraies réponses",
  "Autoconsommation collective et batteries : les solutions pour copropriétés et PME",
  "Comment dimensionner votre système batterie : capacité utile, profil de consommation, puissance crête",
];

function getTodayTopic() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  return TOPICS[dayOfYear % TOPICS.length];
}

async function generateContent(topic) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20251022",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Tu es Simon Monteiro, dirigeant de CLIQUIDE FRANCE SAS, expert en stockage d'énergie solaire.
Tu distribues les batteries Renon Power (Xcellent, Xtreme LV, EBrick), installateur Quali PV 500 kWc.
Site : batterie-stockage.fr | Tel : 06 63 70 66 30 | Zone : Nord de la France

Écris un post LinkedIn professionnel sur ce sujet : "${topic}"

Règles :
- 150 à 250 mots
- Commence par une accroche forte (question ou chiffre), PAS par "Je" ou "Bonjour"
- Ton expert mais accessible
- 1 ou 2 emojis maximum
- Termine par un appel à l'action discret (mentionner batterie-stockage.fr)
- 3 à 5 hashtags à la fin
- Réponds UNIQUEMENT avec le texte du post, rien d'autre`,
      },
    ],
  });

  const block = msg.content.find((b) => b.type === "text");
  if (!block) throw new Error("Pas de texte dans la réponse Claude");
  return block.text.trim();
}

async function postToLinkedIn(content) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!accessToken) throw new Error("LINKEDIN_ACCESS_TOKEN manquant");

  const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) {
    const err = await profileRes.text();
    throw new Error(`Erreur profil LinkedIn : ${err}`);
  }
  const profile = await profileRes.json();
  const authorUrn = `urn:li:person:${profile.sub}`;

  const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  if (!postRes.ok) {
    const err = await postRes.text();
    throw new Error(`Erreur ugcPosts LinkedIn : ${err}`);
  }
  return await postRes.json();
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const topic = getTodayTopic();
    console.log("[LinkedIn] Sujet :", topic);

    const content = await generateContent(topic);
    console.log("[LinkedIn] Contenu généré :", content.substring(0, 80) + "...");

    const result = await postToLinkedIn(content);
    console.log("[LinkedIn] Post publié :", result.id);

    return Response.json({
      success: true,
      postId: result.id,
      topic,
      preview: content.substring(0, 100) + "...",
    });
  } catch (err) {
    console.error("[LinkedIn] Erreur :", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
