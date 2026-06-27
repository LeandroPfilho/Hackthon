/**
 * Worker de reprocessamento diário (Seção 6.8) — porte de worker.py.
 *
 * Antes de recalcular, atualiza a previsão de chuva (acumulado 72h + 7 dias)
 * de cada trecho com dados reais do Open-Meteo (lib/services/weather). Depois
 * recalcula o Índice de Trafegabilidade de todos e registra o log da execução.
 */
import { config } from "@/lib/config";
import type { Repository } from "@/lib/repository";
import type { Segment } from "@/lib/types";
import { fetchSegmentWeather } from "@/lib/services/weather";

/** Atualiza chuva de todos os trechos via Open-Meteo. Retorna quantos foram atualizados. */
async function refreshWeather(repo: Repository): Promise<number> {
  const segments = await repo.listSegments();
  const results = await Promise.all(
    segments.map(async (seg) => {
      if (seg.latitude == null || seg.longitude == null) return false;
      const weather = await fetchSegmentWeather(seg.latitude, seg.longitude);
      if (!weather) return false;
      const patch: Partial<Segment> = {
        forecast_rain_7d: weather.forecast_rain_7d,
        forecast_daily: weather.forecast_daily,
      };
      if (weather.accumulated_rain_72h != null) {
        patch.accumulated_rain_72h = weather.accumulated_rain_72h;
      }
      await repo.updateSegment(seg.id, patch);
      return true;
    }),
  );
  return results.filter(Boolean).length;
}

export async function reprocessDaily(
  repo: Repository,
  opts: { weather?: boolean } = {},
): Promise<{
  status: string;
  updated: number;
  message: string;
  executed_at: string | null;
}> {
  try {
    // Override explícito (?weather=1/0) vence tudo — permite a demo "híbrida":
    // clima real sob demanda. Em modo demo, o cron NÃO busca clima por padrão
    // (senão refreshWeather→updateSegment sobrescreveria os scores curados,
    // furando o congelamento). Fora do demo, segue a flag de ambiente.
    const useWeather = opts.weather ?? (config.demoMode ? false : config.enableWeather);
    const refreshed = useWeather ? await refreshWeather(repo) : 0;
    const updated = await repo.recalculateAll();
    const detail =
      refreshed > 0 ? ` (${refreshed} com previsão real do Open-Meteo)` : "";
    const message = `Reprocessamento diário concluído: ${updated} trechos recalculados${detail}.`;
    const log = await repo.addProcessingLog("success", message);
    return { status: "success", updated, message, executed_at: log.execution_date };
  } catch (err) {
    const message = `Falha no reprocessamento diário: ${String(err)}`;
    await repo.addProcessingLog("error", message).catch(() => undefined);
    return { status: "error", updated: 0, message, executed_at: null };
  }
}
