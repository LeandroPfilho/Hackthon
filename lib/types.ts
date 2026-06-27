/**
 * Tipos de domínio do LinhaMap (porte dos schemas/enums do backend Python).
 * Espelham os tipos ENUM do banco (database/schema.sql).
 */

export const RISK_LEVELS = ["baixo", "medio", "alto", "critico"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const REPORT_CATEGORIES = [
  "buraco",
  "lama",
  "erosao",
  "ponte_danificada",
  "atolamento",
  "outro",
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const REPORT_SEVERITIES = ["baixa", "media", "alta", "critica"] as const;
export type ReportSeverity = (typeof REPORT_SEVERITIES)[number];

export const REPORT_STATUSES = ["aberta", "em_analise", "resolvida"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** Papel da conta: cidadão (denuncia/segue) vs secretaria (back-office). */
export const USER_ROLES = ["cidadao", "secretaria"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Coordenada [lon, lat] (padrão GeoJSON). */
export type Coordinate = [number, number];

export interface GeoJSONLine {
  type: "LineString";
  coordinates: Coordinate[];
}

/** Previsão de chuva de um dia (gráfico de 7 dias). */
export interface DailyForecast {
  date: string;
  mm: number;
}

/** Trecho de linha vicinal monitorado (road_segments). */
export interface Segment {
  id: string;
  name: string;
  rural_line: string;
  coordinates: Coordinate[] | null;
  latitude: number;
  longitude: number;
  slope: number;
  accumulated_rain_72h: number;
  forecast_rain_7d: number;
  forecast_daily: DailyForecast[] | null;
  reports_count: number;
  risk_score: number;
  risk_level: RiskLevel;
  explanation: string | null;
  updated_at: string | null;
  /** Preenchido na serialização para o mapa. */
  geometry?: GeoJSONLine | null;
}

/** Contribuição de um fator para o score (transparência). */
export interface FactorBreakdown {
  key: string;
  label: string;
  value: number;
  subscore: number;
  weight: number;
  contribution: number;
}

/** Detalhe do trecho para o painel lateral (Seção 6.2). */
export interface SegmentDetail extends Segment {
  recommendations: string[];
  factors: FactorBreakdown[];
}

/** Denúncia colaborativa (reports). */
export interface Report {
  id: string;
  user_id: string | null;
  reporter_name: string | null;
  phone: string | null;
  road_segment_id: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  image_url: string | null;
  category: ReportCategory;
  severity: ReportSeverity;
  confidence: number | null;
  status: ReportStatus;
  created_at: string | null;
  updated_at: string | null;
}

/** Resultado da classificação de uma denúncia (Seção 6.5). */
export interface ClassificationResult {
  categoria: ReportCategory;
  severidade: ReportSeverity;
  confianca: number;
  justificativa: string;
  fonte: "ia" | "regras";
}

/** Log de execução do worker (processing_logs). */
export interface ProcessingLog {
  id: string;
  execution_date: string;
  status: string;
  message: string;
  created_at: string;
}

/** Faixas de score -> nível (Seção 6.3). */
export function scoreToLevel(score: number): RiskLevel {
  if (score >= 75) return "critico";
  if (score >= 50) return "alto";
  if (score >= 25) return "medio";
  return "baixo";
}

/** Ordem dos níveis (para detectar piora). */
export const LEVEL_RANK: Record<RiskLevel, number> = {
  baixo: 0,
  medio: 1,
  alto: 2,
  critico: 3,
};

// --- Alertas / Seguir trecho ---
export const ALERT_CHANNELS = ["in_app", "email", "whatsapp"] as const;
export type AlertChannel = (typeof ALERT_CHANNELS)[number];

/** Inscrição para receber alertas de um trecho. */
export interface Follow {
  id: string;
  user_id: string | null;
  segment_id: string;
  name: string | null;
  contact: string | null;
  channel: AlertChannel;
  created_at: string;
}

/** Notificação de alerta gerada para um seguidor. */
export interface AppNotification {
  id: string;
  user_id: string | null;
  segment_id: string | null;
  segment_name: string | null;
  contact: string | null;
  channel: AlertChannel;
  level: RiskLevel;
  message: string;
  status: string; // 'in_app' | 'simulada' (e-mail/WhatsApp ainda não enviam de fato)
  created_at: string;
}

// --- Ordens de Serviço (manutenção) ---
export const WORK_ORDER_STATUSES = [
  "agendada",
  "em_execucao",
  "concluida",
  "cancelada",
] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export interface WorkOrder {
  id: string;
  segment_id: string | null;
  title: string;
  status: WorkOrderStatus;
  assigned_team: string | null;
  notes: string | null;
  report_ids: string[];
  created_at: string;
  updated_at: string;
}
