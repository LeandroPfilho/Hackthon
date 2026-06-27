import { type NextRequest, NextResponse } from "next/server";

import { getRepository } from "@/lib/repository";
import { requireSecretariaApi } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

/** GET /api/work-orders/[id] — detalhe de uma OS. */
export async function GET(_req: NextRequest, { params }: Params) {
  const repo = getRepository();
  const wo = await repo.getWorkOrder(params.id);
  if (!wo) return NextResponse.json({ error: "Ordem não encontrada." }, { status: 404 });
  return NextResponse.json(wo);
}

/** PATCH /api/work-orders/[id] — atualiza status/equipe/notas (concluir baixa o risco). Secretaria. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireSecretariaApi();
  if (!guard.ok) return guard.response;

  const repo = getRepository();
  const body = await req.json().catch(() => ({}));
  const wo = await repo.updateWorkOrder(params.id, body);
  if (!wo) return NextResponse.json({ error: "Ordem não encontrada." }, { status: 404 });
  return NextResponse.json(wo);
}
