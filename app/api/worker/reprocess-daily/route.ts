import { type NextRequest, NextResponse } from "next/server";

import { config } from "@/lib/config";
import { getRepository } from "@/lib/repository";
import { reprocessDaily } from "@/lib/services/worker";

export const dynamic = "force-dynamic";

/** Autoriza quando não há segredo configurado ou o Bearer confere. */
function authorized(req: NextRequest): boolean {
  if (!config.cronSecret) return true;
  return req.headers.get("authorization") === `Bearer ${config.cronSecret}`;
}

/**
 * Reprocessa o risco de todos os trechos e registra log (cron diário, Seção 6.8).
 * Aceita POST (GitHub Actions) e GET (Vercel Cron, que dispara via GET).
 * Se CRON_SECRET estiver definido, exige Authorization: Bearer <CRON_SECRET>.
 */
/** ?weather=1/true força buscar clima; =0/false força pular; ausente usa ENABLE_WEATHER. */
function weatherOverride(req: NextRequest): boolean | undefined {
  const v = req.nextUrl.searchParams.get("weather");
  if (v === null) return undefined;
  return v === "1" || v === "true";
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const result = await reprocessDaily(getRepository(), { weather: weatherOverride(req) });
  return NextResponse.json(result);
}

export const POST = handle;
export const GET = handle;
