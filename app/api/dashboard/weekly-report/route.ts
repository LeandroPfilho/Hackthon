import { NextResponse } from "next/server";

import { getRepository } from "@/lib/repository";
import { generateWeeklySummary } from "@/lib/services/reporting";

export const dynamic = "force-dynamic";

/** GET /api/dashboard/weekly-report — relatório semanal completo (dados + texto). */
export async function GET() {
  const repo = getRepository();
  const [segments, reports] = await Promise.all([repo.listSegments(), repo.listReports()]);
  return NextResponse.json(await generateWeeklySummary(segments, reports));
}
