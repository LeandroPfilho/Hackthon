import { NextResponse } from "next/server";

import { getRepository } from "@/lib/repository";
import { getSessionUser } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

/** GET /api/notifications — alertas do usuário logado (mais recentes primeiro). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json([]);
  const repo = getRepository();
  return NextResponse.json(await repo.listNotifications(50, user.id));
}
