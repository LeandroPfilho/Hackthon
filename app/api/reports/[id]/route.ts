import { type NextRequest, NextResponse } from "next/server";

import { getRepository } from "@/lib/repository";
import { requireSecretariaApi } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

/** GET /api/reports/[id] — detalhe de uma denúncia. */
export async function GET(_req: NextRequest, { params }: Params) {
  const repo = getRepository();
  const report = await repo.getReport(params.id);
  if (!report) return NextResponse.json({ error: "Denúncia não encontrada." }, { status: 404 });
  return NextResponse.json(report);
}

/** PUT /api/reports/[id] — atualiza uma denúncia (recalcula o trecho). Secretaria. */
export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireSecretariaApi();
  if (!guard.ok) return guard.response;

  const repo = getRepository();
  const body = await req.json().catch(() => ({}));
  const report = await repo.updateReport(params.id, body);
  if (!report) return NextResponse.json({ error: "Denúncia não encontrada." }, { status: 404 });
  return NextResponse.json(report);
}

/** DELETE /api/reports/[id] — remove uma denúncia (recalcula o trecho). Secretaria. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireSecretariaApi();
  if (!guard.ok) return guard.response;

  const repo = getRepository();
  const ok = await repo.deleteReport(params.id);
  if (!ok) return NextResponse.json({ error: "Denúncia não encontrada." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
