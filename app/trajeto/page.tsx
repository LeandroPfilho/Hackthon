import { RoutePlanner } from "@/components/route/route-planner";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

export const metadata = { title: "Consulta de Trajeto — LinhaMap" };

/** Consulta de trajeto A→B: risco agregado e melhor janela do caminho. */
export default async function TrajetoPage() {
  const repo = getRepository();
  const segments = await repo.listSegments();

  return (
    <div className="container py-10">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Consulta de trajeto</h1>
        <p className="text-muted-foreground">
          Selecione os trechos do seu caminho para ver a passabilidade do trajeto inteiro e o
          melhor dia para transportar a produção. Um caminho é tão seguro quanto o seu pior
          trecho.
        </p>
      </div>
      <RoutePlanner segments={segments} />
    </div>
  );
}
