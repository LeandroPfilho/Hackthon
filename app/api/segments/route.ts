import { type NextRequest, NextResponse } from "next/server";

import { getRepository } from "@/lib/repository";
import { serializeSegment, serializeSegmentDetail } from "@/lib/services/serializers";

export const dynamic = "force-dynamic";

/** GET /api/segments — lista todos os trechos (para o mapa). */
export async function GET() {
  const repo = getRepository();
  const segments = await repo.listSegments();
  return NextResponse.json(segments.map(serializeSegment));
}

/** POST /api/segments — cria um trecho e calcula seu score inicial. */
export async function POST(req: NextRequest) {
  const repo = getRepository();
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.rural_line) {
    return NextResponse.json(
      { error: "Campos obrigatórios: name, rural_line." },
      { status: 400 },
    );
  }
  const seg = await repo.createSegment(body);
  const reports = await repo.reportsForSegment(seg.id);
  return NextResponse.json(serializeSegmentDetail(seg, reports), { status: 201 });
}
