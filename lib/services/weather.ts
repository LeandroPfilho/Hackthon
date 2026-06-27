/**
 * Integração meteorológica real (Open-Meteo) — Seção 7.
 *
 * Em uma única chamada busca a chuva dos 3 dias passados (acumulado 72h) e a
 * previsão dos próximos 7 dias por trecho, a partir de lat/lon. É consumida
 * pelo worker de reprocessamento (lib/services/worker.ts). Falha de rede =>
 * retorna null e o trecho mantém os valores atuais (degrada com segurança).
 */
import { config } from "@/lib/config";
import type { DailyForecast } from "@/lib/types";

export interface SegmentWeather {
  /** Chuva acumulada nos últimos ~3 dias (mm). null quando a API não traz passado. */
  accumulated_rain_72h: number | null;
  /** Soma da precipitação prevista para os próximos 7 dias (mm). */
  forecast_rain_7d: number;
  /** Previsão dia a dia (data "DD/MM" + mm). */
  forecast_daily: DailyForecast[];
}

/** Bloco `daily` cru do Open-Meteo. */
export interface OpenMeteoDaily {
  time?: string[];
  precipitation_sum?: (number | null)[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** "2026-06-13" -> "13/06" (sem depender de Date/timezone). */
function toDayMonth(iso: string): string {
  const parts = iso.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : iso;
}

/**
 * Converte o bloco `daily` do Open-Meteo em {acumulado 72h, previsão 7d}.
 * Função PURA (sem rede) — separada para ser testável de forma determinística.
 *
 * Convenção da requisição: `past_days=3` + `forecast_days=7`. Os 7 últimos
 * itens são a previsão; o que vier antes é passado (acumulado das últimas 72h).
 */
export function parseOpenMeteoDaily(daily: OpenMeteoDaily | undefined): SegmentWeather {
  const time = daily?.time ?? [];
  const sums = (daily?.precipitation_sum ?? []).map((v) => Number(v ?? 0));
  const n = Math.min(time.length, sums.length);
  const pastN = Math.max(0, n - 7); // os 7 finais são a previsão

  const past = sums.slice(0, pastN);
  const accumulated_rain_72h = past.length
    ? round1(past.slice(-3).reduce((a, b) => a + b, 0))
    : null;

  const forecast_daily: DailyForecast[] = [];
  for (let i = pastN; i < n; i++) {
    forecast_daily.push({ date: toDayMonth(time[i]), mm: round1(sums[i]) });
  }
  const forecast_rain_7d = round1(forecast_daily.reduce((a, d) => a + d.mm, 0));

  return { accumulated_rain_72h, forecast_rain_7d, forecast_daily };
}

/** Busca chuva acumulada (72h) + previsão (7d) de um ponto. null em falha/timeout. */
export async function fetchSegmentWeather(
  latitude: number,
  longitude: number,
): Promise<SegmentWeather | null> {
  try {
    const url = new URL(config.openMeteoBaseUrl);
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("daily", "precipitation_sum");
    url.searchParams.set("past_days", "3");
    url.searchParams.set("forecast_days", "7");
    url.searchParams.set("timezone", "America/Porto_Velho");

    const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { daily?: OpenMeteoDaily };
    const parsed = parseOpenMeteoDaily(json.daily);
    if (parsed.forecast_daily.length === 0) return null; // resposta vazia/ inesperada
    return parsed;
  } catch {
    return null; // sem rede/erro => mantém os dados atuais
  }
}
