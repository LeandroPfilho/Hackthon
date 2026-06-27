/**
 * Serviços do Dashboard da Secretaria (Seção 6.6) — porte de dashboard.py.
 * Funções puras: cards, lista de críticos, ocorrências por categoria e CSV.
 */
import type { Report, Segment } from "@/lib/types";

export function buildSummary(segments: Segment[], reports: Report[]) {
  const scores = segments.map((s) => s.risk_score ?? 0);
  return {
    total_segments: segments.length,
    critical_segments: segments.filter((s) => s.risk_level === "critico").length,
    high_segments: segments.filter((s) => s.risk_level === "alto").length,
    open_reports: reports.filter((r) => r.status === "aberta").length,
    resolved_reports: reports.filter((r) => r.status === "resolvida").length,
    average_index: scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0,
  };
}

export function criticalSegments(segments: Segment[]): Segment[] {
  return segments
    .filter((s) => s.risk_level === "alto" || s.risk_level === "critico")
    .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));
}

/** Intensidade do ponto de calor por severidade da denúncia (0–1). */
export function severityIntensity(severity: Report["severity"] | string | null | undefined): number {
  switch (severity) {
    case "critica":
      return 1;
    case "alta":
      return 0.7;
    case "media":
      return 0.4;
    default:
      return 0.2;
  }
}

/**
 * Monta os pontos do mapa de calor a partir das denúncias.
 * Função pura: ignora denúncias sem geolocalização e mapeia severidade → intensidade.
 */
export function heatPoints(reports: Report[]): Array<[number, number, number]> {
  return reports
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => [r.latitude as number, r.longitude as number, severityIntensity(r.severity)]);
}

/** Filtros do Dashboard, compartilhados entre a UI (cliente) e a exportação CSV. */
export interface DashboardFilters {
  ruralLine?: string;
  riskLevel?: string;
  status?: string;
  category?: string;
  origin?: string; // "with_account" | "anonymous" | ""
  period?: string; // "all" | "1" | "7" | "30" (dias)
}

/** Filtra trechos pelos critérios aplicáveis a segmento (linha e risco). */
export function filterSegments(segments: Segment[], f: DashboardFilters): Segment[] {
  return segments.filter((s) => {
    if (f.ruralLine && s.rural_line !== f.ruralLine) return false;
    if (f.riskLevel && s.risk_level !== f.riskLevel) return false;
    return true;
  });
}

/**
 * Filtra denúncias pelos critérios do Dashboard. `now` é injetável para manter
 * a função pura/testável (default = agora). Reutilizada pela UI e pelo CSV.
 */
export function filterReports(
  reports: Report[],
  segments: Segment[],
  f: DashboardFilters,
  now: number = Date.now(),
): Report[] {
  const segLine = new Map(segments.map((s) => [String(s.id), s]));
  return reports.filter((r) => {
    const seg = r.road_segment_id ? segLine.get(String(r.road_segment_id)) : undefined;
    if (f.ruralLine && seg?.rural_line !== f.ruralLine) return false;
    if (f.riskLevel && seg?.risk_level !== f.riskLevel) return false;
    if (f.status && r.status !== f.status) return false;
    if (f.category && r.category !== f.category) return false;
    if (f.origin === "with_account" && r.user_id == null) return false;
    if (f.origin === "anonymous" && r.user_id != null) return false;
    if (f.period && f.period !== "all" && r.created_at) {
      const ageDays = (now - new Date(r.created_at).getTime()) / 86_400_000;
      if (ageDays > Number(f.period)) return false;
    }
    return true;
  });
}

export function reportsByCategory(reports: Report[]): Array<{ category: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const r of reports) {
    const cat = r.category ?? "outro";
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

const CSV_COLUMNS = [
  "id",
  "created_at",
  "reporter_name",
  "phone",
  "rural_line",
  "road_segment_id",
  "latitude",
  "longitude",
  "category",
  "severity",
  "status",
  "confidence",
  "description",
] as const;

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  // Escapa aspas e envolve em aspas se houver vírgula/quebra/aspas.
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function reportsToCsv(reports: Report[], segments: Segment[]): string {
  const segLine = new Map(segments.map((s) => [String(s.id), s.rural_line]));
  const lines = [CSV_COLUMNS.join(",")];
  for (const r of reports) {
    const row: Record<string, unknown> = {
      ...r,
      rural_line: segLine.get(String(r.road_segment_id)) ?? "",
    };
    lines.push(CSV_COLUMNS.map((c) => csvCell(row[c])).join(","));
  }
  return lines.join("\n");
}
