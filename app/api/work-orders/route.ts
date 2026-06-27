import { type NextRequest, NextResponse } from "next/server";

import { getRepository } from "@/lib/repository";
import { requireSecretariaApi } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

/** GET /api/work-orders?status= — lista ordens de serviço. */
export async function GET(req: NextRequest) {
  const repo = getRepository();
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  return NextResponse.json(await repo.listWorkOrders(status));
}

/** POST /api/work-orders — cria uma ordem de serviço (status inicial: agendada). Secretaria. */
export async function POST(req: NextRequest) {
  const guard = await requireSecretariaApi();
  if (!guard.ok) return guard.response;

  const repo = getRepository();
  const data = await req.json().catch(() => ({}));
  if (!data.title) {
    return NextResponse.json({ error: "title é obrigatório." }, { status: 400 });
  }
  const wo = await repo.createWorkOrder({
    segment_id: data.segment_id ?? null,
    title: data.title,
    assigned_team: data.assigned_team ?? null,
    notes: data.notes ?? null,
    report_ids: data.report_ids ?? [],
  });
  return NextResponse.json(wo, { status: 201 });
}
