import { NextResponse } from "next/server";

import { getRepository } from "@/lib/repository";
import { buildSummary } from "@/lib/services/dashboard";

export const dynamic = "force-dynamic";

/** GET /api/dashboard/summary — cards de resumo. */
export async function GET() {
  const repo = getRepository();
  const [segments, reports] = await Promise.all([repo.listSegments(), repo.listReports()]);
  return NextResponse.json(buildSummary(segments, reports));
}
