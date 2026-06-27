/**
 * Planejador de trajeto: um caminho é tão passável quanto o seu pior trecho.
 * Agrega o risco e a janela de escoamento dos trechos selecionados (A→B).
 */
import type { RiskLevel, Segment } from "@/lib/types";

import { computeTravelWindow, type TravelRating, travelRating } from "./forecast";

export interface RouteDay {
  date: string;
  projected: number;
  rating: TravelRating;
}

export interface RouteResult {
  overall_level: RiskLevel | null;
  overall_score: number;
  worst: { name: string; rural_line: string } | null;
  segments: Array<{
    id: string;
    name: string;
    rural_line: string;
    risk_level: RiskLevel;
    risk_score: number;
  }>;
  days: RouteDay[];
  best_day: string | null;
  recommendation: string;
}

export function computeRoute(segments: Segment[]): RouteResult {
  if (segments.length === 0) {
    return {
      overall_level: null,
      overall_score: 0,
      worst: null,
      segments: [],
      days: [],
      best_day: null,
      recommendation: "Selecione os trechos do seu trajeto para avaliar a passabilidade.",
    };
  }

  // O trecho de maior risco domina o trajeto inteiro.
  const worst = segments.reduce((a, b) => (b.risk_score > a.risk_score ? b : a));

  // Janela combinada: a cada dia, vale o pior (maior chuva projetada) do caminho.
  const windows = segments.map((s) => computeTravelWindow(s));
  const dayCount = Math.min(...windows.map((w) => w.days.length));
  const days: RouteDay[] = [];
  for (let i = 0; i < dayCount; i += 1) {
    const projected = Math.max(...windows.map((w) => w.days[i].projected));
    days.push({ date: windows[0].days[i].date, projected, rating: travelRating(projected) });
  }
  const candidates = days.filter((d) => d.rating !== "ruim");
  const best = candidates.length
    ? candidates.reduce((a, b) => (b.projected < a.projected ? b : a))
    : null;

  let recommendation: string;
  if (worst.risk_level === "critico") {
    recommendation = `Trajeto comprometido pelo trecho ${worst.name} (${worst.rural_line}), em risco crítico. Evite o transporte e acione a manutenção.`;
  } else if (!best) {
    recommendation =
      "Chuva projetada alta em todo o trajeto nos próximos 7 dias. Reavalie a data do transporte.";
  } else {
    recommendation = `Trajeto transitável com atenção. Melhor janela: ${best.date}. Ponto de atenção: ${worst.name} (${worst.rural_line}), risco ${worst.risk_level}.`;
  }

  return {
    overall_level: worst.risk_level,
    overall_score: worst.risk_score,
    worst: { name: worst.name, rural_line: worst.rural_line },
    segments: segments.map((s) => ({
      id: s.id,
      name: s.name,
      rural_line: s.rural_line,
      risk_level: s.risk_level,
      risk_score: s.risk_score,
    })),
    days,
    best_day: best?.date ?? null,
    recommendation,
  };
}
