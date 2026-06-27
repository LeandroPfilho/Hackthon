"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { getSegment } from "@/lib/api-client";
import type { Segment, SegmentDetail } from "@/lib/types";

import { MapLegend } from "./map-legend";
import { SegmentDetailPanel } from "./segment-detail-panel";

// Leaflet só no cliente (evita 'window is not defined' no SSR).
const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Carregando mapa…
    </div>
  ),
});

export function MapView({ segments }: { segments: Segment[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SegmentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSelect(id: string) {
    setSelectedId(id);
    setLoading(true);
    try {
      setDetail(await getSegment(id));
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <div className="relative h-1/2 w-full lg:h-full lg:flex-1">
        <LeafletMap segments={segments} selectedId={selectedId} onSelect={handleSelect} />
        <MapLegend />
      </div>
      <aside className="h-1/2 w-full overflow-y-auto border-t bg-background lg:h-full lg:w-[380px] lg:border-l lg:border-t-0">
        <SegmentDetailPanel
          detail={detail}
          loading={loading}
          hasSelection={selectedId !== null}
        />
      </aside>
    </div>
  );
}
