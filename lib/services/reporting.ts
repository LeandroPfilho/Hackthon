/**
 * Relatório semanal para a Secretaria (Seções 6.7/6.6) — porte de reporting.py.
 * `buildWeeklyData` agrega; `generateWeeklySummary` gera o texto (LLM ou regras).
 */
import Anthropic from "@anthropic-ai/sdk";

import { aiEnabled, config } from "@/lib/config";
import { CATEGORY_LABELS } from "@/lib/labels";
import type { Report, ReportCategory, Segment } from "@/lib/types";

/** Rótulo da categoria em minúsculas (fica natural no meio da frase do resumo). */
function categoryLabel(cat: string): string {
  return (CATEGORY_LABELS[cat as ReportCategory] ?? cat).toLowerCase();
}

/** Janela do relatório "semanal" (dias). Recorta as denúncias por created_at. */
export const WEEKLY_WINDOW_DAYS = 7;

export interface WeeklyData {
  window_days: number;
  total_segments: number;
  critical_count: number;
  high_count: number;
  average_index: number;
  critical_segments: Array<{
    name: string;
    rural_line: string;
    risk_level: string;
    risk_score: number;
  }>;
  reports_by_category: Record<string, number>;
  affected_regions: Array<{ rural_line: string; count: number }>;
  reports_total: number;
  reports_open: number;
  reports_in_analysis: number;
  reports_resolved: number;
  priority_recommendations: string[];
}

export function buildWeeklyData(
  segments: Segment[],
  reports: Report[],
  now: number = Date.now(),
): WeeklyData {
  // Recorte semanal: só denúncias dos últimos WEEKLY_WINDOW_DAYS dias.
  // (O risco dos trechos é o estado atual — não tem recorte temporal.)
  const cutoff = now - WEEKLY_WINDOW_DAYS * 86_400_000;
  const weekReports = reports.filter(
    (r) => r.created_at != null && new Date(r.created_at).getTime() >= cutoff,
  );

  const segLine = new Map(segments.map((s) => [String(s.id), s.rural_line]));

  const critical = segments
    .filter((s) => s.risk_level === "alto" || s.risk_level === "critico")
    .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));

  const criticalSegments = critical.slice(0, 5).map((s) => ({
    name: s.name,
    rural_line: s.rural_line,
    risk_level: s.risk_level,
    risk_score: s.risk_score,
  }));

  const reportsByCategory: Record<string, number> = {};
  const affected: Record<string, number> = {};
  for (const r of weekReports) {
    const cat = r.category ?? "outro";
    reportsByCategory[cat] = (reportsByCategory[cat] ?? 0) + 1;
    const line = segLine.get(String(r.road_segment_id));
    if (line) affected[line] = (affected[line] ?? 0) + 1;
  }

  const affectedRegions = Object.entries(affected)
    .map(([rural_line, count]) => ({ rural_line, count }))
    .sort((a, b) => b.count - a.count);

  const scores = segments.map((s) => s.risk_score ?? 0);
  const averageIndex = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : 0;

  const priority = criticalSegments
    .slice(0, 3)
    .map(
      (s) =>
        `Priorizar ${s.name} (${s.rural_line}) — risco ${s.risk_level} (índice ${s.risk_score.toFixed(0)}).`,
    );

  return {
    window_days: WEEKLY_WINDOW_DAYS,
    total_segments: segments.length,
    critical_count: segments.filter((s) => s.risk_level === "critico").length,
    high_count: segments.filter((s) => s.risk_level === "alto").length,
    average_index: averageIndex,
    critical_segments: criticalSegments,
    reports_by_category: reportsByCategory,
    affected_regions: affectedRegions,
    reports_total: weekReports.length,
    reports_open: weekReports.filter((r) => r.status === "aberta").length,
    reports_in_analysis: weekReports.filter((r) => r.status === "em_analise").length,
    reports_resolved: weekReports.filter((r) => r.status === "resolvida").length,
    priority_recommendations: priority,
  };
}

function renderTextByRules(data: WeeklyData): string {
  const blocos: string[] = [];
  blocos.push(
    `Relatório semanal de trafegabilidade rural — Ariquemes/RO. No período, ${data.total_segments} ` +
      `trechos foram monitorados, sendo ${data.critical_count} em nível crítico e ${data.high_count} ` +
      `em nível alto. O índice médio de trafegabilidade foi de ${data.average_index}/100.`,
  );

  if (data.critical_segments.length) {
    const nomes = data.critical_segments
      .map((s) => `${s.name} (${s.rural_line}), risco ${s.risk_level}`)
      .join("; ");
    blocos.push(`Trechos que exigem atenção prioritária: ${nomes}.`);
  }

  const cats = Object.entries(data.reports_by_category).sort((a, b) => b[1] - a[1]);
  if (cats.length) {
    const catTxt = cats.map(([c, n]) => `${n} de ${categoryLabel(c)}`).join(", ");
    blocos.push(
      `Foram registradas ${data.reports_total} ocorrências (${data.reports_open} abertas, ` +
        `${data.reports_resolved} resolvidas), distribuídas por categoria: ${catTxt}.`,
    );
  }

  if (data.affected_regions.length) {
    const regioes = data.affected_regions
      .slice(0, 5)
      .map((r) => `${r.rural_line} (${r.count})`)
      .join(", ");
    blocos.push(`Regiões mais afetadas por número de relatos: ${regioes}.`);
  }

  if (data.priority_recommendations.length) {
    blocos.push(`Recomendações de prioridade: ${data.priority_recommendations.join(" ")}`);
  }

  return blocos.join("\n\n");
}

async function renderTextWithAi(data: WeeklyData): Promise<string | null> {
  if (!aiEnabled()) return null;
  try {
    const client = new Anthropic({ apiKey: config.anthropicApiKey });
    const message = await client.messages.create({
      model: config.aiModelReport,
      max_tokens: 600,
      system:
        "Você redige relatórios oficiais para a Secretaria de Obras. Escreva um resumo semanal " +
        "claro, objetivo e em tom institucional, pronto para ata ou ofício, em português do Brasil. " +
        "Use os dados fornecidos; não invente números.",
      messages: [
        {
          role: "user",
          content: `Gere o resumo semanal de trafegabilidade rural a partir destes dados (JSON):\n\n${JSON.stringify(
            data,
            null,
            2,
          )}`,
        },
      ],
    });
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

export async function generateWeeklySummary(
  segments: Segment[],
  reports: Report[],
): Promise<{ summary: string; generated_by: "ia" | "regras"; data: WeeklyData }> {
  const data = buildWeeklyData(segments, reports);
  const aiText = await renderTextWithAi(data);
  if (aiText) return { summary: aiText, generated_by: "ia", data };
  return { summary: renderTextByRules(data), generated_by: "regras", data };
}
