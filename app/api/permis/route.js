import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "PC_LOCAUX";
  const limit = searchParams.get("limit") || "50";
  const date_min = searchParams.get("date_min") || "";
  const surface_min = searchParams.get("surface_min") || "";

  const params = new URLSearchParams({
    dep_code: "78",
    permit_types: type,
    limit,
    sort: "-date_decision",
  });

  if (date_min) params.append("decision_date_min", date_min);
  if (surface_min) params.append("surface_min", surface_min);

  const res = await fetch(`https://api.permisapi.fr/v1/permits?${params}`, {
    headers: { "X-API-Key": process.env.PERMISAPI_KEY },
  });

 const data = await res.json();
return NextResponse.json({ results: data.data, pagination: data.pagination });
}
