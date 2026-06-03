import Anthropic from "@anthropic-ai/sdk";

const TOPICS = [
  { text: "Les avantages du stockage par batterie pour les particuliers", model: "xcellent-plus" },
  { text: "Batteries LFP vs NMC : Lithium Fer Phosphate est le plus sur", model: "xcellent" },
  { text: "Raccordement batterie panneaux solaires AC-couple vs DC-couple", model: "xcellent-plus" },
  { text: "ROI rentabilite systeme solaire batterie en 2025", model: "xcellent-plus" },
  { text: "Aides stockage batterie France TVA 5,5% CEE aides regionales", model: "xcellent" },
  { text: "Choisir entre Xcellent Xcellent Plus Xtreme LV et EBrick", model: "xcellent" },
  { text: "Duree de vie garantie recyclage batteries LFP", model: "ebrick" },
  { text: "Autoconsommation collective batteries coproprietes PME", model: "xtreme-lv" },
  { text: "Dimensionner systeme batterie capacite utile profil consommation", model: "xtreme-lv" },
];
const IMAGE_COUNTS = { "xcellent": 9, "xcellent-plus": 7, "xtreme-lv": 9, "ebrick": 8 };
const BASE_IMAGE_URL = "https://raw.githubusercontent.com/simonrpima/batterie-stockage-html/main/images/batteries";
function getTodayTopic() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return TOPICS[dayOfYear % TOPICS.length];
}async function getImageAsBase64(model) {
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
  const body = { author: `urn:li:person:${process.env.LINKEDIN_PERSON_ID}`, lifecycleState: "PUBLISHED", specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text }, shareMediaCategory: imageAsset ? "IMAGE" : "NONE", ...(imageAsset && { media: [{ status: "READY", description: { text: "Batterie Renon Power" }, media: imageAsset, title: { text: "Batterie Stockage FR" } }] }) } }, visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" } };
  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" }, body: JSON.stringify(body) });
  return res.json();
}export async function POST(request) {
  try {
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    if (!accessToken) return Response.json({ error: "LINKEDIN_ACCESS_TOKEN manquant" }, { status: 500 });
    const topic = getTodayTopic();
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const completion = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages: [{ role: "user", content: `Tu es un expert en stockage d energie solaire. Redige un post LinkedIn professionnel en francais sur : "${topic.text}". 150-250 mots, accroche forte, appel action vers batterie-stockage.fr, 2-3 emojis, 3-4 hashtags a la fin, pas de prix specifiques.` }]
    });
    const postText = completion.content[0].text;
    let imageAsset = null;
    try {
      const { base64 } = await getImageAsBase64(topic.model);
      imageAsset = await uploadImageToLinkedIn(accessToken, base64);
    } catch (e) { console.error("Image error:", e); }
    const linkedinResult = await postToLinkedIn(accessToken, postText, imageAsset);
    return Response.json({ success: true, topic: topic.text, post: postText, linkedin: linkedinResult });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}