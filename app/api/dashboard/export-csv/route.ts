import { type NextRequest, NextResponse } from "next/server";

import { getRepository } from "@/lib/repository";
import { requireSecretariaApi } from "@/lib/supabase/auth-server";
import { filterReports, reportsToCsv } from "@/lib/services/dashboard";

export const dynamic = "force-dynamic";

/** GET /api/dashboard/export-csv — exporta as denúncias (respeita os filtros do Dashboard). Secretaria. */
export async function GET(req: NextRequest) {
  const guard = await requireSecretariaApi();
  if (!guard.ok) return guard.response;

  const repo = getRepository();
  const [segments, reports] = await Promise.all([repo.listSegments(), repo.listReports()]);
  const sp = req.nextUrl.searchParams;
  const filtered = filterReports(reports, segments, {
    ruralLine: sp.get("rural_line") ?? undefined,
    riskLevel: sp.get("risk_level") ?? undefined,
    status: sp.get("status") ?? undefined,
    category: sp.get("category") ?? undefined,
    origin: sp.get("origin") ?? undefined,
    period: sp.get("period") ?? undefined,
  });
  const csv = reportsToCsv(filtered, segments);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="linhamap_denuncias.csv"',
    },
  });
}
