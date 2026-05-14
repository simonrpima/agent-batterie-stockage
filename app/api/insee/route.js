import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dept = searchParams.get("dept") || "59";
  const nb = searchParams.get("nb") || "50";
  const type = searchParams.get("type") || "";

  let q = `codePostalEtablissement:${dept}*+AND+etatAdministratifEtablissement:A`;
  if (type) {
    q += `+AND+denominationUniteLegale:${type}*`;
  } else {
    q += `+AND+(denominationUniteLegale:GAEC*+OR+denominationUniteLegale:EARL*+OR+denominationUniteLegale:SCEA*)`;
  }

  const url = `https://api.insee.fr/api-sirene/3.11/siret?q=${q}&nombre=${nb}`;

  const response = await fetch(url, {
    headers: {
      "X-INSEE-Api-Key-Integration": process.env.INSEE_API_KEY,
      "Accept": "application/json"
    }
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
