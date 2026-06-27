import { NextResponse } from "next/server";

import { authConfigured, getSessionProfile } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/me — papel da sessão atual, consumido pelo cabeçalho para decidir
 * quais links de navegação mostrar. Em modo mock local (sem chaves públicas)
 * retorna secretaria (acesso total), espelhando o gating server-side.
 */
export async function GET() {
  if (!authConfigured()) {
    return NextResponse.json({ authenticated: true, role: "secretaria" }, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  const profile = await getSessionProfile();
  return NextResponse.json(
    { authenticated: Boolean(profile), role: profile?.role ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
