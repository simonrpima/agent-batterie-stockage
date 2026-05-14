import { NextResponse } from "next/server";

const LIST_IDS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
const TEMPLATE_ID = 5;

export async function GET() {
  const startDate = new Date("2026-05-14");
  const today = new Date();
  const dayIndex = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

  if (dayIndex < 0 || dayIndex >= LIST_IDS.length) {
    return NextResponse.json({ message: "Campagne terminee ou pas encore commencee", dayIndex });
  }

  const listId = LIST_IDS[dayIndex];

  const response = await fetch("https://api.brevo.com/v3/emailCampaigns", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY
    },
    body: JSON.stringify({
      name: `Campagne auto jour ${dayIndex + 1} - ${today.toLocaleDateString("fr-FR")}`,
      subject: "Batteries de stockage — tarifs pro, stock disponible, livraison 48h",
      sender: { name: "Renon Power France", email: "Contact@batterie-stockage.fr" },
      templateId: TEMPLATE_ID,
      recipients: { listIds: [listId] },
      scheduledAt: new Date(today.getTime() + 60000).toISOString()
    })
  });

  const data = await response.json();
  return NextResponse.json({ jour: dayIndex + 1, listId, brevo: data });
}
