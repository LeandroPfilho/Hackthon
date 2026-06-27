import { NextResponse } from "next/server";

import { aiEnabled, dataMode } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Healthcheck: estado do serviço, modo de dados e IA. */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "LinhaMap API",
    version: "0.1.0",
    mode: dataMode(),
    ai_classification: aiEnabled(),
  });
}
