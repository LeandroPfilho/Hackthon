/**
 * Cliente de API do front (browser) — chama os Route Handlers em /api.
 * Para Server Components, prefira importar os serviços/repositório direto.
 */
import type {
  AlertChannel,
  AppNotification,
  ClassificationResult,
  Follow,
  Report,
  ReportStatus,
  Segment,
  SegmentDetail,
  WorkOrder,
  WorkOrderStatus,
} from "@/lib/types";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

// --- Trechos ---
export const getSegments = () => http<Segment[]>("/api/segments");
export const getSegment = (id: string) => http<SegmentDetail>(`/api/segments/${id}`);
export const recalculateSegments = () =>
  http<{ updated: number; message: string }>("/api/segments/recalculate", { method: "POST" });

// --- Denúncias ---
export interface ReportFilterParams {
  status?: string;
  category?: string;
  road_segment_id?: string;
}
export function getReports(params: ReportFilterParams = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => Boolean(v)) as [string, string][],
  ).toString();
  return http<Report[]>(`/api/reports${qs ? `?${qs}` : ""}`);
}
export const createReport = (data: Partial<Report>) =>
  http<Report>("/api/reports", { method: "POST", body: JSON.stringify(data) });
export const updateReportStatus = (id: string, status: ReportStatus) =>
  http<Report>(`/api/reports/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

// --- IA ---
export const classifyReport = (description?: string, image_url?: string) =>
  http<ClassificationResult>("/api/ai/classify-report", {
    method: "POST",
    body: JSON.stringify({ description, image_url }),
  });

// --- Dashboard ---
export const getDashboardSummary = () =>
  http<{
    total_segments: number;
    critical_segments: number;
    high_segments: number;
    open_reports: number;
    resolved_reports: number;
    average_index: number;
  }>("/api/dashboard/summary");
export const getCriticalSegments = () => http<Segment[]>("/api/dashboard/critical-segments");
export const getReportsByCategory = () =>
  http<Array<{ category: string; count: number }>>("/api/dashboard/reports-by-category");
export const getWeeklyReport = () =>
  http<{ summary: string; generated_by: string; data: Record<string, unknown> }>(
    "/api/dashboard/weekly-report",
  );

/** URL para download do CSV (usar em <a href>). */
export const exportCsvUrl = "/api/dashboard/export-csv";

// --- Alertas / seguir trecho ---
export const followSegment = (data: { segment_id: string; channel?: AlertChannel }) =>
  http<Follow>("/api/follows", { method: "POST", body: JSON.stringify(data) });

export const getNotifications = () => http<AppNotification[]>("/api/notifications");

// --- Ordens de serviço ---
export const createWorkOrder = (data: {
  segment_id?: string | null;
  title: string;
  assigned_team?: string | null;
  notes?: string | null;
  report_ids?: string[];
}) => http<WorkOrder>("/api/work-orders", { method: "POST", body: JSON.stringify(data) });

export const getWorkOrders = () => http<WorkOrder[]>("/api/work-orders");

export const updateWorkOrder = (id: string, data: Partial<WorkOrder>) =>
  http<WorkOrder>(`/api/work-orders/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const advanceWorkOrder = (id: string, status: WorkOrderStatus) =>
  updateWorkOrder(id, { status });
