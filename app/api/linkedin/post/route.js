import Anthropic from "@anthropic-ai/sdk";

const TOPICS = [
  { text: "Les avantages du stockage par batterie pour les particuliers", model: "xcellent-plus" },
  { text: "Batteries LFP vs NMC : Lithium Fer Phosphate est le plus sur", model: "xcellent" },
  { text: "Raccordement batterie panneaux solaires AC-couple vs DC-couple", model: "xcellent-plus" },
  { text: "ROI rentabilite systeme solaire batterie en 2026", model: "xcellent-plus" },
  { text: "Aides stockage batterie France TVA 5,5% CEE aides regionales", model: "xcellent" },
  { text: "Choisir entre Xcellent Xcellent Plus Xtreme LV et EBrick", model: "xcellent" },
  { text: "Duree de vie garantie recyclage batteries LFP", model: "ebrick" },
  { text: "Autoconsommation collective batteries coproprietes PME", model: "xtreme-lv" },
  { text: "Dimensionner systeme batterie capacite utile profil consommation", model: "xtreme-lv" },
];
// Images réelles du site (le dossier images/batteries/ n'a jamais existé → les posts partaient sans visuel)
const SITE = "https://www.batterie-stockage.fr";
const IMAGES = {
  "xcellent":      [`${SITE}/images/produits/renon/Renon_xcellent-face.jpg`],
  "xcellent-plus": [`${SITE}/images/produits/renon/Renon_xcellent-plus-face.jpg`],
  "xtreme-lv":     [`${SITE}/images/produits/renon/Renon_xtreme-face.jpg`],
  "ebrick":        [`${SITE}/images/produits/renon/Renon_ebrick-face.jpg`],
};
const PERSON_ID = process.env.LINKEDIN_PERSON_ID || "83pLP4CfJm";
const LI_HEADERS = (token) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "X-Restli-Protocol-Version": "2.0.0",
});

function getTodayTopic() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return TOPICS[dayOfYear % TOPICS.length];
}

// Vérifie le jeton AVANT de dépenser un appel Claude : /v2/userinfo répond 401 si expiré.
async function checkToken(accessToken) {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.ok) return { ok: true };
  let detail = {};
  try { detail = await res.json(); } catch {}
  return { ok: false, status: res.status, detail };
}

async function getImageAsBase64(model) {
  const list = IMAGES[model] || IMAGES["xtreme-lv"];
  const url = list[Math.floor(Math.random() * list.length)];
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image ${url} → HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

async function uploadImageToLinkedIn(accessToken, base64Data) {
  const initRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: LI_HEADERS(accessToken),
    body: JSON.stringify({ registerUploadRequest: { recipes: ["urn:li:digitalmediaRecipe:feedshare-image"], owner: `urn:li:person:${PERSON_ID}`, serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }] } }),
  });
  const initData = await initRes.json();
  if (!initRes.ok) throw new Error(`registerUpload HTTP ${initRes.status}: ${JSON.stringify(initData)}`);
  const uploadUrl = initData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
  const asset = initData.value.asset;
  const put = await fetch(uploadUrl, { method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "image/jpeg" }, body: Buffer.from(base64Data, "base64") });
  if (!put.ok) throw new Error(`upload image HTTP ${put.status}`);
  return asset;
}

async function postToLinkedIn(accessToken, text, imageAsset) {
  const body = { author: `urn:li:person:${PERSON_ID}`, lifecycleState: "PUBLISHED", specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text }, shareMediaCategory: imageAsset ? "IMAGE" : "NONE", ...(imageAsset && { media: [{ status: "READY", description: { text: "Batterie Renon Power" }, media: imageAsset, title: { text: "Batterie Stockage FR" } }] }) } }, visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" } };
  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", { method: "POST", headers: LI_HEADERS(accessToken), body: JSON.stringify(body) });
  let data = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, postId: res.headers.get("x-restli-id") || data.id || null, data };
}

// Protection optionnelle : si CRON_SECRET est défini, l'appel doit porter ?key=… ou Authorization: Bearer …
function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const url = new URL(request.url);
  const auth = request.headers.get("authorization") || "";
  return url.searchParams.get("key") === secret || auth === `Bearer ${secret}`;
}

export async function POST(request) {
  try {
    if (!isAuthorized(request)) return Response.json({ success: false, error: "Non autorisé" }, { status: 401 });

    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    if (!accessToken) return Response.json({ success: false, error: "LINKEDIN_ACCESS_TOKEN manquant" }, { status: 500 });

    // 1. Jeton valide ? Sinon on s'arrête tout de suite, en erreur HTTP (Make passe en Error → alerte).
    const check = await checkToken(accessToken);
    if (!check.ok) {
      console.error("LinkedIn token invalide:", JSON.stringify(check));
      return Response.json({
        success: false,
        error: "Jeton LinkedIn expiré ou invalide — renouveler via /api/linkedin/auth",
        linkedin: check.detail,
      }, { status: 502 });
    }

    // 2. Génération du texte
    const topic = getTodayTopic();
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const completion = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{ role: "user", content: `Tu es un expert en stockage d energie solaire. Redige un post LinkedIn professionnel en francais sur : "${topic.text}". 150-250 mots, accroche forte, appel action vers batterie-stockage.fr, 2-3 emojis, 3-4 hashtags a la fin, pas de prix specifiques.` }]
    });
    const postText = completion.content[0].text;

    // 3. Image (facultative : on publie sans image si elle échoue)
    let imageAsset = null;
    let imageError = null;
    try {
      const base64 = await getImageAsBase64(topic.model);
      imageAsset = await uploadImageToLinkedIn(accessToken, base64);
    } catch (e) { imageError = e.message; console.error("Image error:", e.message); }

    // 4. Publication — toute réponse non-2xx de LinkedIn devient une erreur HTTP côté Make
    const li = await postToLinkedIn(accessToken, postText, imageAsset);
    console.log("LinkedIn result:", li.status, JSON.stringify(li.data));
    if (!li.ok) {
      return Response.json({ success: false, error: `LinkedIn a refusé la publication (HTTP ${li.status})`, topic: topic.text, linkedin: li.data }, { status: 502 });
    }
    return Response.json({ success: true, topic: topic.text, postId: li.postId, withImage: !!imageAsset, imageError, post: postText });
  } catch (error) {
    console.error("ERREUR:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
export async function GET(request) {
  return POST(request);
}
