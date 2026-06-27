import { type NextRequest, NextResponse } from "next/server";

import { getRepository } from "@/lib/repository";
import { getSessionUser } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

/** GET /api/follows?segment_id= — lista as inscrições do usuário logado. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json([]);
  const repo = getRepository();
  const segmentId = req.nextUrl.searchParams.get("segment_id") ?? undefined;
  return NextResponse.json(await repo.listFollows(segmentId, user.id));
}

/** POST /api/follows — segue um trecho (exige login) e recebe a confirmação. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Entre na sua conta para receber alertas." },
      { status: 401 },
    );
  }
  const repo = getRepository();
  const data = await req.json().catch(() => ({}));
  if (!data.segment_id) {
    return NextResponse.json({ error: "segment_id é obrigatório." }, { status: 400 });
  }
  const follow = await repo.addFollow({
    segment_id: data.segment_id,
    user_id: user.id,
    name: data.name ?? user.email ?? null,
    contact: data.contact ?? user.email ?? null,
    channel: data.channel ?? "in_app",
  });
  return NextResponse.json(follow, { status: 201 });
}
