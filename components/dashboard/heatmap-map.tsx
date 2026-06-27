"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";

const ARIQUEMES_CENTER: [number, number] = [-9.88, -63.07];

/** Assinatura mínima do plugin leaflet.heat (não tipado). */
type HeatLeaflet = typeof L & {
  heatLayer?: (points: [number, number, number][], opts?: Record<string, unknown>) => L.Layer;
};

function HeatLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  useEffect(() => {
    let layer: L.Layer | undefined;
    let cancelled = false;

    // leaflet.heat é uma IIFE que estende o `L` GLOBAL (window.L). Precisamos
    // garantir que window.L exista ANTES de carregar o plugin — por isso o L é
    // exposto e o plugin é importado dinamicamente (só no cliente, após o Leaflet).
    (async () => {
      (window as unknown as { L: typeof L }).L = L;
      await import("leaflet.heat");
      const HL = L as HeatLeaflet;
      if (cancelled || typeof HL.heatLayer !== "function") return;
      layer = HL.heatLayer(points, {
        radius: 28,
        blur: 20,
        maxZoom: 13,
        gradient: { 0.2: "#16a34a", 0.4: "#eab308", 0.7: "#f97316", 1.0: "#dc2626" },
      });
      layer.addTo(map);
    })();

    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map, points]);
  return null;
}

/** Mapa de calor das denúncias — carregado client-only (ssr:false). */
export default function HeatmapMap({ points }: { points: [number, number, number][] }) {
  return (
    <MapContainer
      center={ARIQUEMES_CENTER}
      zoom={10}
      scrollWheelZoom={false}
      className="h-full w-full"
      style={{ background: "#e8eef0" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <HeatLayer points={points} />
    </MapContainer>
  );
}
