import { NextResponse } from "next/server";

import { getRepository } from "@/lib/repository";
import { reportsByCategory } from "@/lib/services/dashboard";

export const dynamic = "force-dynamic";

/** GET /api/dashboard/reports-by-category — contagem de ocorrências por categoria. */
export async function GET() {
  const repo = getRepository();
  const reports = await repo.listReports();
  return NextResponse.json(reportsByCategory(reports));
}
