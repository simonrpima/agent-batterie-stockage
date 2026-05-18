import { NextResponse } from "next/server";

const LIST_IDS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
const TEMPLATE_ID = 5;

export async function GET() {
  const startDate = new Date("2026-05-14");
  const today = new Date();
  const dayIndex = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

  if (dayIndex < 0 || dayIndex >= LIST_IDS.length) {
    return NextResponse.json({ message: "Campagne terminée ou pas encore commencée", dayIndex });
  }

  const listId = LIST_IDS[dayIndex];

  // Récupérer les contacts de la liste
  const contactsRes = await fetch(
    `https://api.brevo.com/v3/contacts/lists/${listId}/contacts?limit=500`,
    { headers: { "api-key": process.env.BREVO_API_KEY } }
  );
  const contactsData = await contactsRes.json();
  const contacts = contactsData.contacts || [];

  if (contacts.length === 0) {
    return NextResponse.json({ message: "Aucun contact dans la liste", listId, jour: dayIndex + 1 });
  }

  // Envoyer un email transactionnel à chaque contact
  let sent = 0;
  let errors = 0;

  for (const contact of contacts) {
    if (!contact.email) continue;
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          to: [{ email: contact.email }],
          templateId: TEMPLATE_ID,
          sender: { name: "CLIQUIDE FRANCE", email: "Contact@batterie-stockage.fr" },
        }),
      });
      if (res.ok) sent++;
      else errors++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({
    success: true,
    jour: dayIndex + 1,
    listId,
    totalContacts: contacts.length,
    sent,
    errors,
  });
}
