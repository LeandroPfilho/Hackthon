"use client";

import "leaflet/dist/leaflet.css";

import { Fragment } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from "react-leaflet";

import { RISK_COLORS } from "@/lib/risk";
import type { Segment } from "@/lib/types";

const ARIQUEMES_CENTER: [number, number] = [-9.88, -63.07];

/**
 * Mapa Leaflet — carregado SOMENTE no cliente (via next/dynamic ssr:false em
 * map-view.tsx) para evitar 'window is not defined' no SSR do Next.
 */
export default function LeafletMap({
  segments,
  selectedId,
  onSelect,
}: {
  segments: Segment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <MapContainer
      center={ARIQUEMES_CENTER}
      zoom={10}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: "#e8eef0" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {segments.map((seg) => {
        const coords = seg.geometry?.coordinates ?? seg.coordinates;
        if (!coords || coords.length === 0) return null;
        const positions = coords.map((c) => [c[1], c[0]] as [number, number]);
        const color = RISK_COLORS[seg.risk_level];
        const selected = seg.id === selectedId;
        return (
          <Fragment key={seg.id}>
            <Polyline
              positions={positions}
              pathOptions={{
                color,
                weight: selected ? 9 : 5,
                opacity: selected ? 1 : 0.85,
              }}
              eventHandlers={{ click: () => onSelect(seg.id) }}
            >
              <Tooltip sticky>
                <strong>{seg.rural_line}</strong> — {seg.name}
              </Tooltip>
            </Polyline>
            <CircleMarker
              center={[seg.latitude, seg.longitude]}
              radius={selected ? 9 : 6}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: color,
                fillOpacity: 1,
              }}
              eventHandlers={{ click: () => onSelect(seg.id) }}
            />
          </Fragment>
        );
      })}
    </MapContainer>
  );
}
