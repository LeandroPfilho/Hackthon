/**
 * Contrato e utilidades compartilhadas do repositório.
 * (Separado de index.ts para evitar importações circulares entre mock/supabase.)
 */
import { calculateTrafficIndex } from "@/lib/services/scoring";
import type {
  AlertChannel,
  AppNotification,
  Follow,
  ProcessingLog,
  Report,
  Segment,
  WorkOrder,
} from "@/lib/types";

export interface ReportFilters {
  status?: string | null;
  category?: string | null;
  road_segment_id?: string | null;
  /** Quando definido, retorna apenas as denúncias deste usuário. */
  user_id?: string | null;
}

export interface FollowInput {
  segment_id: string;
  user_id?: string | null;
  name?: string | null;
  contact?: string | null;
  channel?: AlertChannel;
}

export interface WorkOrderInput {
  segment_id?: string | null;
  title: string;
  assigned_team?: string | null;
  notes?: string | null;
  report_ids?: string[];
}

export interface Repository {
  // Trechos
  listSegments(): Promise<Segment[]>;
  getSegment(id: string): Promise<Segment | null>;
  createSegment(data: Partial<Segment>): Promise<Segment>;
  updateSegment(id: string, data: Partial<Segment>): Promise<Segment | null>;
  deleteSegment(id: string): Promise<boolean>;
  reportsForSegment(id: string): Promise<Report[]>;
  recalculateAll(): Promise<number>;
  // Denúncias
  listReports(filters?: ReportFilters): Promise<Report[]>;
  getReport(id: string): Promise<Report | null>;
  createReport(data: Partial<Report>): Promise<Report>;
  updateReport(id: string, data: Partial<Report>): Promise<Report | null>;
  deleteReport(id: string): Promise<boolean>;
  setReportStatus(id: string, status: string): Promise<Report | null>;
  // Logs
  addProcessingLog(status: string, message: string): Promise<ProcessingLog>;
  listProcessingLogs(limit?: number): Promise<ProcessingLog[]>;
  // Alertas / seguir trecho
  addFollow(data: FollowInput): Promise<Follow>;
  listFollows(segmentId?: string, userId?: string): Promise<Follow[]>;
  removeFollow(id: string): Promise<boolean>;
  listNotifications(limit?: number, userId?: string): Promise<AppNotification[]>;
  // Ordens de serviço
  createWorkOrder(data: WorkOrderInput): Promise<WorkOrder>;
  listWorkOrders(status?: string): Promise<WorkOrder[]>;
  getWorkOrder(id: string): Promise<WorkOrder | null>;
  updateWorkOrder(id: string, data: Partial<WorkOrder>): Promise<WorkOrder | null>;
}

/** Campos do score recalculados pelo motor (compartilhado pelos modos). */
export function scoreFields(segment: Partial<Segment>, reports: Report[]): Partial<Segment> {
  // Denúncias resolvidas não pesam mais no risco (ex.: após manutenção/OS).
  const active = reports.filter((r) => r.status !== "resolvida");
  const result = calculateTrafficIndex({
    accumulatedRain72h: segment.accumulated_rain_72h ?? 0,
    forecastRain7d: segment.forecast_rain_7d ?? 0,
    slope: segment.slope ?? 0,
    reports: active,
  });
  return {
    risk_score: result.score,
    risk_level: result.level,
    explanation: result.explanation,
    reports_count: active.length,
    updated_at: new Date().toISOString(),
  };
}
