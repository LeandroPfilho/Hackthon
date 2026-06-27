import { NextResponse } from "next/server";

import { getRepository } from "@/lib/repository";
import { criticalSegments } from "@/lib/services/dashboard";
import { serializeSegment } from "@/lib/services/serializers";

export const dynamic = "force-dynamic";

/** GET /api/dashboard/critical-segments — trechos alto/crítico, maior risco primeiro. */
export async function GET() {
  const repo = getRepository();
  const segments = await repo.listSegments();
  return NextResponse.json(criticalSegments(segments).map(serializeSegment));
}
