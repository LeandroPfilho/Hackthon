import { type NextRequest, NextResponse } from "next/server";

import { getRepository } from "@/lib/repository";
import { classifyReport } from "@/lib/services/ai-classifier";
import { getSessionUser } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

/** GET /api/reports — lista denúncias com filtros (status, categoria, trecho). */
export async function GET(req: NextRequest) {
  const repo = getRepository();
  const sp = req.nextUrl.searchParams;
  const reports = await repo.listReports({
    status: sp.get("status"),
    category: sp.get("category"),
    road_segment_id: sp.get("road_segment_id"),
  });
  return NextResponse.json(reports);
}

/**
 * POST /api/reports — registra uma denúncia e recalcula o trecho afetado.
 * Se categoria/severidade não vierem, a classificação automática preenche.
 */
export async function POST(req: NextRequest) {
  const repo = getRepository();
  const data = await req.json().catch(() => ({}));

  // Vincula à conta logada (se houver) para aparecer em "Minhas denúncias".
  const user = await getSessionUser();
  data.user_id = user?.id ?? null;

  if (!data.category || !data.severity) {
    const result = await classifyReport(data.description, data.image_url);
    data.category = data.category ?? result.categoria;
    data.severity = data.severity ?? result.severidade;
    data.confidence = result.confianca;
  }

  const report = await repo.createReport(data);
  return NextResponse.json(report, { status: 201 });
}
