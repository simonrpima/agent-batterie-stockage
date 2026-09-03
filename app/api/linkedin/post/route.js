import Anthropic from "@anthropic-ai/sdk";

// Chaque sujet renvoie vers une page du site (trafic + backlinks) — rotation sur 36 sujets ≈ 18 semaines à 2 posts/semaine
const SITE = "https://www.batterie-stockage.fr";
const TOPICS = [
  // Prix / ROI / aides
  { text: "Combien coute vraiment une batterie solaire en 2026 : fourchettes par capacite et pieges des devis", img: "xcellent-plus", url: "/batterie-solaire-prix-2026.html" },
  { text: "ROI d une batterie solaire : le calcul reel avec un tarif electricite a 0,25 EUR/kWh", img: "xcellent-plus", url: "/blog/roi-batterie-solaire-calcul-reel.html" },
  { text: "Aides et subventions stockage solaire 2026 : TVA reduite, CEE, aides regionales — ce qui existe vraiment", img: "xcellent", url: "/blog/aides-subventions-energie-solaire-2026.html" },
  { text: "Simulez votre autoconsommation avec batterie : le calculateur gratuit du site", img: "xtreme-lv", url: "/calculateur-batterie-autoconsommation.html" },
  { text: "Pourquoi le prix des batteries LFP baisse encore et ce que ca change pour votre projet", img: "ebrick", url: "/batterie-solaire-prix-2026.html" },
  // Dimensionnement / technique
  { text: "Batterie solaire 10 kWh : pour quel foyer, quel profil de consommation, quel modele", img: "xcellent", url: "/blog/batterie-solaire-10kwh-quel-modele.html" },
  { text: "Dimensionner sa batterie : capacite utile, profondeur de decharge et profil jour/nuit", img: "xtreme-lv", url: "/residentiel.html" },
  { text: "Batterie triphasee pour la maison : le guide complet et les erreurs de raccordement", img: "xcellent-plus", url: "/blog/batterie-triphasee-maison-guide.html" },
  { text: "AC-couple ou DC-couple : comment raccorder une batterie a une installation solaire existante", img: "xcellent-plus", url: "/onduleurs.html" },
  { text: "Onduleur Deye : quelles batteries sont compatibles et comment les parametrer", img: "xtreme-lv", url: "/blog/onduleur-deye-batterie-compatible.html" },
  { text: "Les 7 erreurs a eviter quand on installe un stockage d energie solaire", img: "ebrick", url: "/blog/stockage-energie-solaire-erreurs-eviter.html" },
  { text: "LFP vs NMC : pourquoi le lithium fer phosphate s impose pour le stockage residentiel", img: "xcellent", url: "/residentiel.html" },
  { text: "Duree de vie, cycles, garantie et recyclage d une batterie LFP : ce qu il faut verifier", img: "ebrick", url: "/documentation.html" },
  { text: "Pompe a chaleur + solaire + batterie : le trio qui fait vraiment baisser la facture", img: "xcellent-plus", url: "/residentiel.html" },
  { text: "Vehicule electrique a la maison : recharger sur sa batterie solaire, mythe ou realite", img: "xtreme-lv", url: "/bornes.html" },
  { text: "Bornes de recharge VE 7 a 22 kW : ce qui change avec une batterie domestique", img: "xtreme-lv", url: "/bornes.html" },
  // Marques / produits
  { text: "Renon Power vs BYD : comparatif honnete 2026 sur le stockage LiFePO4", img: "xcellent", url: "/blog/renon-power-vs-byd-comparatif-2026.html" },
  { text: "Xcellent, Xcellent Plus, Xtreme LV, EBrick : quelle batterie Renon Power pour quel usage", img: "xcellent-plus", url: "/marques.html" },
  { text: "Chisage MOON, CE, Link : la gamme residentielle qui monte en France", img: "chisage", url: "/marques.html" },
  { text: "Onduleurs hybrides Chisage Jup et Mars : robustesse, rendement, compatibilite 48 V", img: "chisage-ond", url: "/onduleurs.html" },
  { text: "EBU Energy : batteries et bornes, une marque a suivre en 2026", img: "ebu", url: "/marques.html" },
  { text: "Pourquoi choisir un distributeur avec stock en France et SAV local plutot qu un import direct", img: "xcellent", url: "/contact.html" },
  { text: "Fiches techniques et certificats de garantie : ou les trouver, comment les lire", img: "ebrick", url: "/documentation.html" },
  // Pro / industrie / collectivites
  { text: "Autoconsommation collective : comment une mairie ou une PME partage sa production solaire", img: "cal", url: "/solutions-pro-industrie.html" },
  { text: "Stockage industriel de 40 kWh a 5 MW : conteneurs BESS, ecretage de pointe, tarifs heures creuses", img: "industriel", url: "/industrie.html" },
  { text: "Coproprietes et PME : mutualiser une batterie, ce que dit la reglementation", img: "cal", url: "/solutions-pro-industrie.html" },
  { text: "Ecretage de pointe : reduire sa puissance souscrite grace au stockage", img: "industriel", url: "/industrie.html" },
  { text: "Installateurs RGE : le programme partenaire, tarifs pro et hotline technique", img: "xcellent-plus", url: "/espace-pro.html" },
  { text: "Retour chantier : une commune equipe son grand toit en 94 kWc pour revendre en ACC", img: "cal", url: "/solutions-pro-industrie.html" },
  { text: "Batterie de secours : garder le frigo, la chaudiere et internet pendant une coupure", img: "xtreme-lv", url: "/residentiel.html" },
  // Saison / actualite
  { text: "Rentree : les 3 verifications a faire sur son installation solaire avant l hiver", img: "ebrick", url: "/blog/stockage-energie-solaire-erreurs-eviter.html" },
  { text: "Hiver et batterie solaire : que reste-t-il de l autoconsommation quand les jours raccourcissent", img: "xcellent", url: "/blog/roi-batterie-solaire-calcul-reel.html" },
  { text: "Heures creuses + batterie : charger la nuit au tarif bas, consommer le soir", img: "xtreme-lv", url: "/calculateur-batterie-autoconsommation.html" },
  { text: "Fin de l obligation d achat a tarif fixe pour certains contrats : stocker plutot que revendre", img: "xcellent-plus", url: "/batterie-solaire-prix-2026.html" },
  { text: "Les questions que posent toujours les clients avant d acheter une batterie (et nos reponses)", img: "xcellent", url: "/contact.html" },
  { text: "Un installateur temoigne : ce que change une batterie bien dimensionnee sur la satisfaction client", img: "xcellent-plus", url: "/espace-pro.html" },
];
// Photos produits du site (le dossier images/batteries/ n'a jamais existé → les posts partaient sans visuel)
const IMAGES = {
  "xcellent":      [`${SITE}/images/produits/renon/Renon_xcellent-face.jpg`],
  "xcellent-plus": [`${SITE}/images/produits/renon/Renon_xcellent-plus-face.jpg`],
  "xtreme-lv":     [`${SITE}/images/produits/renon/Renon_xtreme-face.jpg`],
  "ebrick":        [`${SITE}/images/produits/renon/Renon_ebrick-face.jpg`],
  "chisage":       [`${SITE}/images/produits/chisage/Chisage_Moon10-W.jpg`, `${SITE}/images/produits/chisage/Chisage_Moon16-G-Pro.jpg`, `${SITE}/images/produits/chisage/Chisage_CE48100.jpg`],
  "chisage-ond":   [`${SITE}/images/produits/chisage/Chisage_Jup.jpg`, `${SITE}/images/produits/chisage/Chisage_Mars.jpg`],
  "ebu":           [`${SITE}/images/produits/ebu/EBU_HVI_all-in-one.jpg`],
  "cal":           [`${SITE}/images/produits/chisage/Chisage_CAL60-RH.jpg`, `${SITE}/images/produits/chisage/Chisage_GAN30.jpg`],
  "industriel":    [`${SITE}/images/produits/ebu/EBU_FR260_industriel.jpg`, `${SITE}/images/produits/renon-ci/Renon_MPack_233A.jpg`],
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
    const link = `${SITE}${topic.url}?utm_source=linkedin&utm_medium=social&utm_campaign=auto`;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const completion = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 900,
      messages: [{ role: "user", content: `Tu rediges les posts LinkedIn de Simon Monteiro, fondateur de batterie-stockage.fr (distributeur francais de batteries de stockage solaire : Renon Power, Chisage, EBU Energy ; stock en France, SAV local). Il installe lui-meme : ton concret, terrain, sans jargon marketing.

Sujet du jour : "${topic.text}"
Lien a inclure tel quel, sur sa propre ligne, vers la fin : ${link}

Contraintes :
- Francais, 900 a 1300 caracteres, phrases courtes, paragraphes de 1 a 3 lignes separes par une ligne vide.
- Ligne 1 = accroche factuelle ou question concrete (pas de "Saviez-vous que", pas de "En tant qu'expert").
- Au moins un chiffre ou un ordre de grandeur technique (kWh, cycles, %, annees) — jamais de prix en euros.
- Un conseil actionnable que le lecteur peut appliquer.
- Terminer par une phrase d'appel a l'action qui renvoie vers le lien, puis 3 hashtags maximum sur la derniere ligne.
- 1 ou 2 emojis maximum, pas de liste a puces, pas de titre, pas de gras markdown.
Reponds uniquement avec le texte du post.` }]
    });
    const postText = completion.content[0].text;

    // 3. Image (facultative : on publie sans image si elle échoue)
    let imageAsset = null;
    let imageError = null;
    try {
      const base64 = await getImageAsBase64(topic.img);
      imageAsset = await uploadImageToLinkedIn(accessToken, base64);
    } catch (e) { imageError = e.message; console.error("Image error:", e.message); }

    // 4. Publication — toute réponse non-2xx de LinkedIn devient une erreur HTTP côté Make
    const li = await postToLinkedIn(accessToken, postText, imageAsset);
    console.log("LinkedIn result:", li.status, JSON.stringify(li.data));
    if (!li.ok) {
      return Response.json({ success: false, error: `LinkedIn a refusé la publication (HTTP ${li.status})`, topic: topic.text, linkedin: li.data }, { status: 502 });
    }
    return Response.json({ success: true, topic: topic.text, link, postId: li.postId, withImage: !!imageAsset, imageError, post: postText });
  } catch (error) {
    console.error("ERREUR:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
export async function GET(request) {
  return POST(request);
}
