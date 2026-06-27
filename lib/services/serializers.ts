/**
 * Serializadores: transformam registros no formato da API.
 * Constroem a geometria GeoJSON e enriquecem o detalhe do trecho com a análise.
 */
import { config } from "@/lib/config";
import type { Report, Segment, SegmentDetail } from "@/lib/types";

import { buildRecommendations, calculateTrafficIndex } from "./scoring";

export function buildGeometry(segment: Segment): Segment["geometry"] {
  const coords = segment.coordinates;
  if (!coords || coords.length === 0) return null;
  return { type: "LineString", coordinates: coords };
}

/** Versão de lista/mapa: trecho + geometria GeoJSON. */
export function serializeSegment(segment: Segment): Segment {
  return { ...segment, geometry: buildGeometry(segment) };
}

/**
 * Versão detalhada (painel lateral): recalcula a análise ao vivo.
 *
 * Em `demoMode`, o cabeçalho (score/nível/explicação) vem dos valores
 * **armazenados** (curados) em vez de recalcular — assim o painel não decai com
 * o tempo. Os fatores continuam refletindo as entradas reais e as recomendações
 * passam a derivar do nível armazenado, mantendo a coerência.
 */
export function serializeSegmentDetail(
  segment: Segment,
  reports: Report[],
  opts: { demoMode?: boolean } = {},
): SegmentDetail {
  // Mantém coerência com scoreFields: ignora denúncias resolvidas.
  const active = reports.filter((r) => r.status !== "resolvida");
  const result = calculateTrafficIndex({
    accumulatedRain72h: segment.accumulated_rain_72h ?? 0,
    forecastRain7d: segment.forecast_rain_7d ?? 0,
    slope: segment.slope ?? 0,
    reports: active,
  });

  const demoMode = opts.demoMode ?? config.demoMode;
  if (demoMode) {
    return {
      ...serializeSegment(segment),
      risk_score: segment.risk_score,
      risk_level: segment.risk_level,
      explanation: segment.explanation ?? result.explanation,
      recommendations: buildRecommendations(segment.risk_level, result.factors, active.length),
      factors: result.factors,
    };
  }

  return {
    ...serializeSegment(segment),
    risk_score: result.score,
    risk_level: result.level,
    explanation: result.explanation,
    recommendations: result.recommendations,
    factors: result.factors,
  };
}
