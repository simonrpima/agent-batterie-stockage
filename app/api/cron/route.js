import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch("https://api.brevo.com/v3/senders", {
    headers: { "api-key": process.env.BREVO_API_KEY },
  });
  const data = await res.json();
  return NextResponse.json(data);
}
