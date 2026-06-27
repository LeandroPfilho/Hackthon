import { redirect } from "next/navigation";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getRepository } from "@/lib/repository";
import { checkSecretariaAccess } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard da Secretaria — LinhaMap",
};

/** Área administrativa da Secretaria de Obras (Seção 6.6). Só Secretaria acessa. */
export default async function DashboardPage() {
  const access = await checkSecretariaAccess();
  if (!access.allow) redirect(access.status === 401 ? "/login?next=/dashboard" : "/?forbidden=1");

  const repo = getRepository();
  const [segments, reports] = await Promise.all([repo.listSegments(), repo.listReports()]);

  return (
    <div className="container py-10">
      {/* Agregados (cards/gráfico/críticos) são calculados no cliente e reagem aos filtros. */}
      <DashboardView reports={reports} segments={segments} />
    </div>
  );
}
