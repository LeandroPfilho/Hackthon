import { NextResponse } from "next/server";

import { getRepository } from "@/lib/repository";
import { requireSecretariaApi } from "@/lib/supabase/auth-server";
import { reprocessDaily } from "@/lib/services/worker";

export const dynamic = "force-dynamic";

/**
 * POST /api/segments/recalculate — atualiza a chuva real (Open-Meteo) e
 * recalcula o score de todos os trechos. Usado para sincronizar após o deploy.
 * Restrito à Secretaria (operação de back-office).
 */
export async function POST() {
  const guard = await requireSecretariaApi();
  if (!guard.ok) return guard.response;

  const result = await reprocessDaily(getRepository());
  return NextResponse.json(result);
}
