import Anthropic from "@anthropic-ai/sdk";

const kv = {
  get: async (key) => {
    const r = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
    });
    const d = await r.json();
    return d.result;
  },
  set: async (key, value) => {
    await fetch(`${process.env.KV_REST_API_URL}/set/${key}/${value}`, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
    });
  }
};

const TOPICS = [
  { text: "Les avantages du stockage par batterie pour les particuliers : autoconsommation optimisée, indépendance du réseau, économies sur la facture EDF", model: "xcellent-plus" },
  { text: "Batteries LFP vs NMC : pourquoi la technologie Lithium Fer Phosphate (Renon Power / Xcellent) est la plus sûre pour une installation résidentielle", model: "xcellent" },
  { text: "Tout savoir sur le raccordement batterie + panneaux solaires : AC-couplé vs DC-couplé, onduleurs hybrides", model: "xcellent-plus" },
  { text: "ROI et rentabilité d'un système solaire + batterie en 2025 : chiffres réels, simulation pour une maison de 150 m²", model: "xcellent-plus" },
  { text: "Les aides pour le stockage batterie en France : TVA 5,5%, CEE, aides régionales — ce qui existe vraiment", model: "xcellent" },
  { text: "Batteries Renon Power : comment choisir entre Xcellent, Xcellent Plus, Xtreme LV et EBrick selon ses besoins", model: "xcellent" },
  { text: "Durée de vie, garantie, maintenance, recyclage des batteries LFP : les vraies réponses", model: "ebrick" },
  { text: "Autoconsommation collective et batteries : les solutions pour copropriétés et PME", model: "xtreme-lv" },
  { text: "Comment dimensionner votre système batterie : capacité utile, profil de consommation, puissance crête", model: "xtreme-lv" },
];

const PRODUCT_INFO = `
Gammes batteries Renon Power distribuées par CLIQUIDE FRANCE :
- Xcellent : 5,12 kWh (modulaire, résidentiel)
- Xcellent Plus : 16 kWh (résidentiel grande capacité)
- Xtreme LV : 10 à 30 kWh (grandes maisons, petits commerces, basse tension)
- EBrick : 5,12 à 30 kWh (format compact empilable, gain de place)
Important : tous les modèles peuvent être mis en parallèle pour augmenter la capacité totale.
`;

const IMAGE_COUNTS = {
  "xcellent": 9,
  "xcellent-plus": 7,
  "xtreme-lv": 9,
  "ebrick": 8,
};

const BASE_IMAGE_URL = "https://raw.githubusercontent.com/simonrpima/batterie-stockage-html/main/images/batteries";

function getTodayTopic() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  return TOPICS[dayOfYear % TOPICS.length];
}

async function getImageAsBase64(model) {
  const count = IMAGE_COUNTS[model] || 1;
  const randomIndex = Math.floor(Math.random() * count) + 1;
  const url = `${BASE_IMAGE_URL}/${model}/jpeg${randomIndex}.jpg`;
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return { base64, url };
}

async function uploadImageToLinkedIn(accessToken, base64Data) {
  const initRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: `urn:li:person:${process.env.LINKEDIN_PERSON_ID}`,
        serviceRelationships: [{
          relationshipType: "OWNER",
          identifier: "urn:li:userGeneratedContent",
        }],
      },
    }),
  });
  const initData = await initRes.json();
  const uploadUrl = initData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
  const asset = initData.value.asset;

  const imageBuffer = Buffer.from(base64Data, "base64");
  await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "image/jpeg",
    },
    body: imageBuffer,
  });

  return asset;
}

async function postToLinkedIn(accessToken, text, imageAsset) {
  const body = {
    author: `urn:li:person:${process.env.LINKEDIN_PERSON_ID}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: imageAsset ? "IMAGE" : "NONE",
        ...(imageAsset && {
          media: [{
            status: "READY",
            description: { text: "Batterie Renon Power" },
            media: imageAsset,
            title: { text: "Batterie Stockage FR" },
          }],
        }),
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function POST(request) {
  try {
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    if (!accessToken) {
      return Response.json({ error: "LINKEDIN_ACCESS_TOKEN manquant" }, { status: 500 });
    }

    const topic = getTodayTopic();

    // Générer le post avec Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Tu es un expert en stockage d'énergie solaire. Rédige un post LinkedIn professionnel et engageant en français sur ce sujet : "${topic.text}".

${PRODUCT_INFO}

Contraintes :
- 150 à 250 mots
- Ton expert mais accessible
- Commence par une accroche forte (chiffre, question ou fait surprenant)
- Termine par un appel à l'action vers batterie-stockage.fr
- Utilise des émojis avec modération (2-3 max)
- Pas de hashtags dans le texte, ajoute 3-4 hashtags pertinents à la fin
- Ne mentionne pas de prix spécifiques`,
      }],
    });

    const postText = completion.content[0].text;

    // Upload image
    let imageAsset = null;
    try {
      const { base64 } = await getImageAsBase64(topic.model);
      imageAsset = await uploadImageToLinkedIn(accessToken, base64);
    } catch (imgError) {
      console.error("Erreur image (non bloquant):", imgError);
    }

    // Publier sur LinkedIn
    const linkedinResult = await postToLinkedIn(accessToken, postText, imageAsset);

    return Response.json({
      success: true,
      topic: topic.text,
      model: topic.model,
      post: postText,
      linkedin: linkedinResult,
    });

  } catch (error) {
    console.error("Erreur:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
