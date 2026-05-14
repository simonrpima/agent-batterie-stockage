import { NextResponse } from "next/server";

export async function POST(request) {
  const body = await request.json();
  const { action } = body;

  // Action : envoyer campagne Brevo automatiquement
  if (action === "send_brevo_campaign") {
    const { listId, templateId } = body;

    const response = await fetch("https://api.brevo.com/v3/emailCampaigns", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        name: `Campagne auto ${new Date().toLocaleDateString("fr-FR")}`,
        subject: "Batteries de stockage — tarifs pro, stock disponible, livraison 48h",
        sender: { name: "Renon Power France", email: "Contact@batterie-stockage.fr" },
        templateId: templateId,
        recipients: { listIds: [listId] },
        scheduledAt: new Date().toISOString()
      })
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  }

  // Action par défaut : appel Claude
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: body.messages
    })
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
