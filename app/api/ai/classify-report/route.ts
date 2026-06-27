import { type NextRequest, NextResponse } from "next/server";

import { classifyReport } from "@/lib/services/ai-classifier";

export const dynamic = "force-dynamic";

/** POST /api/ai/classify-report — classifica por imagem/descrição (IA ou regras). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await classifyReport(body.description, body.image_url);
  return NextResponse.json(result);
}
