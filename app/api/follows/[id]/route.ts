import { type NextRequest, NextResponse } from "next/server";

import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

/** DELETE /api/follows/[id] — deixa de seguir um trecho. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const repo = getRepository();
  const ok = await repo.removeFollow(params.id);
  if (!ok) return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
