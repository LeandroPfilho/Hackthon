/**
 * Janela de escoamento — recomenda os melhores dias dos próximos 7 para
 * transportar a produção, projetando a chuva acumulada dia a dia.
 *
 * Modelo simples e explicável: a cada dia, a chuva acumulada "rola" com
 * decaimento e soma a previsão do dia; quanto menor a acumulada projetada,
 * melhor a trafegabilidade. Trechos já em risco alto/crítico recebem ressalva.
 */
import type { DailyForecast, RiskLevel } from "@/lib/types";

export type TravelRating = "boa" | "moderada" | "ruim";

export interface TravelDay {
  date: string;
  mm: number;
  projected: number; // chuva acumulada projetada (mm)
  rating: TravelRating;
}

export interface TravelWindow {
  bestDay: string | null;
  days: TravelDay[];
  recommendation: string;
}

export function travelRating(projected: number): TravelRating {
  if (projected <= 20) return "boa";
  if (projected <= 45) return "moderada";
  return "ruim";
}

export function computeTravelWindow(segment: {
  forecast_daily: DailyForecast[] | null;
  accumulated_rain_72h: number;
  risk_level: RiskLevel;
}): TravelWindow {
  const forecast = segment.forecast_daily ?? [];
  if (forecast.length === 0) {
    return { bestDay: null, days: [], recommendation: "Sem dados de previsão para o trecho." };
  }

  let running = segment.accumulated_rain_72h ?? 0;
  const days: TravelDay[] = forecast.map((d) => {
    running = running * 0.5 + d.mm; // decaimento + chuva do dia
    const projected = Math.round(running * 10) / 10;
    return { date: d.date, mm: d.mm, projected, rating: travelRating(projected) };
  });

  // Melhor dia: menor chuva projetada que não seja "ruim".
  const candidates = days.filter((d) => d.rating !== "ruim");
  const best = candidates.length
    ? candidates.reduce((a, b) => (b.projected < a.projected ? b : a))
    : null;

  const structurallyRisky = segment.risk_level === "alto" || segment.risk_level === "critico";

  let recommendation: string;
  if (!best) {
    recommendation =
      "Sem janela segura nos próximos 7 dias — chuva projetada alta. Evite o transporte de carga pesada.";
  } else {
    recommendation = `Melhor janela para escoar: ${best.date} (menor chuva projetada, ${best.projected.toFixed(0)} mm acumulados).`;
    if (structurallyRisky) {
      recommendation +=
        " Atenção: o trecho já está comprometido — priorize cargas leves e reduza a velocidade.";
    }
  }

  return { bestDay: best?.date ?? null, days, recommendation };
}
