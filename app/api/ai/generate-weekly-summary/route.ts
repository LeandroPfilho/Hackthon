import { NextResponse } from "next/server";

import { getRepository } from "@/lib/repository";
import { generateWeeklySummary } from "@/lib/services/reporting";

export const dynamic = "force-dynamic";

/** POST /api/ai/generate-weekly-summary — resumo semanal (LLM ou lógica simples). */
export async function POST() {
  const repo = getRepository();
  const [segments, reports] = await Promise.all([repo.listSegments(), repo.listReports()]);
  const result = await generateWeeklySummary(segments, reports);
  return NextResponse.json(result);
}
