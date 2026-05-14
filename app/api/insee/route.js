
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dept = searchParams.get("dept") || "59";

  const url = `https://api.insee.fr/api-sirene/3.11/siret?q=codePostalEtablissement:${dept}000&nombre=5`;

  const response = await fetch(url, {
    headers: {
      "X-INSEE-Api-Key-Integration": process.env.INSEE_API_KEY,
      "Accept": "application/json"
    }
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
