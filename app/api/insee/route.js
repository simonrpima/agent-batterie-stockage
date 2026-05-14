import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dept = searchParams.get("dept") || "59";
  const nb = searchParams.get("nb") || "50";
  const type = searchParams.get("type") || "";

  let denominationFilter = type
    ? `denominationUniteLegale:${type}*`
    : `(denominationUniteLegale:GAEC* OR denominationUniteLegale:EARL* OR denominationUniteLegale:SCEA*)`;

  const q = `${denominationFilter} AND etatAdministratifUniteLegale:A AND codePostalEtablissement:${dept}*`;

  const url = `https://api.insee.fr/api-sirene/3.11/siret?q=${encodeURIComponent(q)}&nombre=${nb}&champs=siret,denominationUniteLegale,nomUniteLegale,prenomUsuelUniteLegale,activitePrincipaleUniteLegale,trancheEffectifsUniteLegale,adresseEtablissement`;

  const response = await fetch(url, {
    headers: {
      "X-INSEE-Api-Key-Integration": process.env.INSEE_API_KEY,
      "Accept": "application/json"
    }
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
