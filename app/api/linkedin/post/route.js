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
  { text: "Les avantages du stockage par batterie pour les particuliers : autoconsommation optimisee, independance du reseau, economies sur la facture EDF", model: "xcellent-plus" },
  { text: "Batteries LFP vs NMC : pourquoi la technologie Lithium Fer Phosphate (Renon Power / Xcellent) est la plus sure pour une installation residentielle", model: "xcellent" },
  { text: "Tout savoir sur le raccordement batterie + panneaux solaires : AC-couple vs DC-couple, onduleurs hybrides", model: "xcellent-plus" },
  { text: "ROI et rentabilite d un systeme solaire + batterie en 2025 : chiffres reels, simulation pour une maison de 150 m2", model: "xcellent-plus" },
  { text: "Les aides pour le stockage batterie en France : TVA 5,5%, CEE, aides regionales - ce qui existe vraiment", model: "xcellent" },
  { text: "Batteries Renon Power : comment choisir entre Xcellent, Xcellent Plus, Xtreme LV et EBrick selon ses besoins", model: "xcellent" },
  { text: "Duree de vie, garantie, maintenance, recyclage des batteries LFP : les vraies reponses", model: "ebrick" },
  { text: "Autoconsommation collective et batteries : les solutions pour coproprietes et PME", model: "xtreme-lv" },
  { text: "Comment dimensionner votre systeme batterie : capacite utile, profil de consommation, puissance crete", model: "xtreme-lv" },
];

const PRODUCT_INFO = "Gammes batteries Renon Power distribuees par CLIQUIDE FRANCE : Xcellent 5,12 kWh, Xcellent Plus 16 kWh, Xtreme LV 10 a 30 kWh, EBrick 5,12 a 30 kWh. Tous les modeles peuvent etre mis en parallele.";

const IMAGE_COUNTS = {
  "xcellent": 9,
  "xcellent-plus": 7,
  "xtreme-lv": 9,
  "ebrick": 8,
};

const BASE_IMAGE_URL = "https://raw.githubusercontent.com/simonrpima/batterie-stockage-html/main/images/batteries";

function getTodayTopic() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
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
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify({ registerUploadRequest: { recipes: ["urn:li:digitalmediaRecipe:feedshare-image"], owner: `urn:li:person:${process.env.LINKEDIN_PERSON_ID}`, serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }] } }),
  });
  const initData = await initRes.json();
  const uploadUrl = initData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
  const asset = initData.value.asset;
  await fetch(uploadUrl, { method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "image/jpeg" }, body: Buffer.from(base64Data, "base64") });
  return asset;
}

async function postToLinkedIn(accessToken, text, imageAsset) {
  const body = { author: `urn:li:person:${process.env.LINKEDIN_PERSON_ID}`, lifecycleState: "PUBLISHED", specificContent: { "com.linkedin.ugc.ShareContent": { shar