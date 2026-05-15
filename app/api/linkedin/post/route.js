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
    model: "claude-sonnet-4-5-20250929",
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

  cons
