import { MapView } from "@/components/map/map-view";
import { getRepository } from "@/lib/repository";
import { serializeSegment } from "@/lib/services/serializers";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mapa de Risco — LinhaMap",
};

/** Tela principal: mapa de risco das linhas vicinais (Seção 6.2). */
export default async function MapaPage() {
  const repo = getRepository();
  const segments = (await repo.listSegments()).map(serializeSegment);
  return <MapView segments={segments} />;
}
