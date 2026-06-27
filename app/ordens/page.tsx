import { redirect } from "next/navigation";

import { WorkOrdersBoard } from "@/components/work-order/work-orders-board";
import { getRepository } from "@/lib/repository";
import { checkSecretariaAccess } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ordens de Serviço — LinhaMap" };

/** Ordens de serviço de manutenção (Secretaria de Obras). Só Secretaria acessa. */
export default async function OrdensPage({
  searchParams,
}: {
  searchParams: { segment?: string };
}) {
  const access = await checkSecretariaAccess();
  if (!access.allow) redirect(access.status === 401 ? "/login?next=/ordens" : "/?forbidden=1");

  const repo = getRepository();
  const [orders, segments] = await Promise.all([
    repo.listWorkOrders(),
    repo.listSegments(),
  ]);

  return (
    <div className="container py-10">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Ordens de serviço</h1>
        <p className="text-muted-foreground">
          Transforme trechos críticos e denúncias em manutenção. Ao concluir uma ordem, as
          denúncias vinculadas são resolvidas e o risco do trecho é recalculado.
        </p>
      </div>
      <WorkOrdersBoard
        initial={orders}
        segments={segments.map((s) => ({ id: s.id, name: s.name, rural_line: s.rural_line }))}
        preselectedSegmentId={searchParams.segment}
      />
    </div>
  );
}
