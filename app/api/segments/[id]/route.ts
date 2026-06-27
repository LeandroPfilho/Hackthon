import { type NextRequest, NextResponse } from "next/server";

import { getRepository } from "@/lib/repository";
import { requireSecretariaApi } from "@/lib/supabase/auth-server";
import { serializeSegmentDetail } from "@/lib/services/serializers";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

/** GET /api/segments/[id] — detalhe com explicação, recomendações e fatores. */
export async function GET(_req: NextRequest, { params }: Params) {
  const repo = getRepository();
  const seg = await repo.getSegment(params.id);
  if (!seg) return NextResponse.json({ error: "Trecho não encontrado." }, { status: 404 });
  const reports = await repo.reportsForSegment(params.id);
  return NextResponse.json(serializeSegmentDetail(seg, reports));
}

/** PUT /api/segments/[id] — atualiza um trecho (revalida o score). Secretaria. */
export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireSecretariaApi();
  if (!guard.ok) return guard.response;

  const repo = getRepository();
  const body = await req.json().catch(() => ({}));
  const seg = await repo.updateSegment(params.id, body);
  if (!seg) return NextResponse.json({ error: "Trecho não encontrado." }, { status: 404 });
  const reports = await repo.reportsForSegment(params.id);
  return NextResponse.json(serializeSegmentDetail(seg, reports));
}

/** DELETE /api/segments/[id] — remove um trecho. Secretaria. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireSecretariaApi();
  if (!guard.ok) return guard.response;

  const repo = getRepository();
  const ok = await repo.deleteSegment(params.id);
  if (!ok) return NextResponse.json({ error: "Trecho não encontrado." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
