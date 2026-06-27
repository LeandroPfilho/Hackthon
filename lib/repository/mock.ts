/**
 * Repositório em memória — porte de MockRepository (repository.py).
 * Semeado a partir de lib/mock-data; permite rodar sem Supabase (Regra 10).
 */
import { config } from "@/lib/config";
import { MOCK_REPORTS, MOCK_SEGMENTS } from "@/lib/mock-data";
import { buildAlertMessage, buildFollowMessage, shouldAlert } from "@/lib/services/alerts";
import type {
  AppNotification,
  Follow,
  ProcessingLog,
  Report,
  RiskLevel,
  Segment,
  WorkOrder,
} from "@/lib/types";

import {
  type FollowInput,
  type ReportFilters,
  type Repository,
  scoreFields,
  type WorkOrderInput,
} from "./base";

function uuid(): string {
  return crypto.randomUUID();
}
function nowIso(): string {
  return new Date().toISOString();
}

export class MockRepository implements Repository {
  private segments: Segment[];
  private reports: Report[];
  private logs: ProcessingLog[] = [];
  private follows: Follow[] = [];
  private notifications: AppNotification[] = [];
  private workOrders: WorkOrder[] = [];

  constructor() {
    this.segments = structuredClone(MOCK_SEGMENTS);
    this.reports = structuredClone(MOCK_REPORTS);
    // Recalcula já na carga para a lista refletir scores coerentes.
    void this.recalculateAll();
  }

  // --- helpers ---
  private findSegment(id: string): Segment | undefined {
    return this.segments.find((s) => String(s.id) === String(id));
  }
  private findReport(id: string): Report | undefined {
    return this.reports.find((r) => String(r.id) === String(id));
  }
  private recalcSegment(id: string): void {
    // Modo demo: não sobrescreve os valores curados (denúncia não erode o score).
    if (config.demoMode) return;
    const seg = this.findSegment(id);
    if (!seg) return;
    const prev = seg.risk_level;
    Object.assign(seg, scoreFields(seg, this.reportsForSegmentSync(id)));
    this.maybeNotify(seg, prev);
  }

  /** Gera notificações aos seguidores quando o risco do trecho piora. */
  private maybeNotify(seg: Segment, prev: RiskLevel): void {
    if (!shouldAlert(prev, seg.risk_level)) return;
    for (const f of this.follows.filter((x) => x.segment_id === seg.id)) {
      this.pushNotification(seg, f, buildAlertMessage(seg));
    }
  }

  private pushNotification(seg: Segment, follow: Follow, message: string): void {
    this.notifications.push({
      id: uuid(),
      user_id: follow.user_id ?? null,
      segment_id: seg.id,
      segment_name: seg.name,
      contact: follow.contact,
      channel: follow.channel,
      level: seg.risk_level,
      message,
      status: follow.channel === "in_app" ? "in_app" : "simulada",
      created_at: nowIso(),
    });
  }
  private reportsForSegmentSync(id: string): Report[] {
    return this.reports.filter((r) => String(r.road_segment_id) === String(id));
  }

  // --- Trechos ---
  async listSegments(): Promise<Segment[]> {
    return structuredClone(this.segments);
  }
  async getSegment(id: string): Promise<Segment | null> {
    const seg = this.findSegment(id);
    return seg ? structuredClone(seg) : null;
  }
  async createSegment(data: Partial<Segment>): Promise<Segment> {
    const seg = {
      id: uuid(),
      reports_count: 0,
      risk_score: 0,
      risk_level: "baixo",
      explanation: null,
      updated_at: nowIso(),
      ...data,
    } as Segment;
    Object.assign(seg, scoreFields(seg, []));
    this.segments.push(seg);
    return structuredClone(seg);
  }
  async updateSegment(id: string, data: Partial<Segment>): Promise<Segment | null> {
    const seg = this.findSegment(id);
    if (!seg) return null;
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && v !== null) (seg as unknown as Record<string, unknown>)[k] = v;
    }
    Object.assign(seg, scoreFields(seg, this.reportsForSegmentSync(id)));
    return structuredClone(seg);
  }
  async deleteSegment(id: string): Promise<boolean> {
    const idx = this.segments.findIndex((s) => String(s.id) === String(id));
    if (idx === -1) return false;
    this.segments.splice(idx, 1);
    for (const r of this.reports) {
      if (String(r.road_segment_id) === String(id)) r.road_segment_id = null;
    }
    return true;
  }
  async reportsForSegment(id: string): Promise<Report[]> {
    return structuredClone(this.reportsForSegmentSync(id));
  }
  async recalculateAll(): Promise<number> {
    // Modo demo: não sobrescreve os valores curados (cron vira no-op de escrita).
    if (config.demoMode) return this.segments.length;
    for (const seg of this.segments) {
      const prev = seg.risk_level;
      Object.assign(seg, scoreFields(seg, this.reportsForSegmentSync(seg.id)));
      this.maybeNotify(seg, prev);
    }
    return this.segments.length;
  }

  // --- Denúncias ---
  async listReports(filters: ReportFilters = {}): Promise<Report[]> {
    let rows = this.reports;
    if (filters.status) rows = rows.filter((r) => r.status === filters.status);
    if (filters.category) rows = rows.filter((r) => r.category === filters.category);
    if (filters.road_segment_id)
      rows = rows.filter((r) => String(r.road_segment_id) === String(filters.road_segment_id));
    if (filters.user_id) rows = rows.filter((r) => r.user_id === filters.user_id);
    rows = [...rows].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    return structuredClone(rows);
  }
  async getReport(id: string): Promise<Report | null> {
    const r = this.findReport(id);
    return r ? structuredClone(r) : null;
  }
  async createReport(data: Partial<Report>): Promise<Report> {
    const report = {
      id: uuid(),
      category: "outro",
      severity: "media",
      confidence: null,
      status: "aberta",
      created_at: nowIso(),
      updated_at: nowIso(),
      ...data,
    } as Report;
    this.reports.push(report);
    if (report.road_segment_id) this.recalcSegment(report.road_segment_id);
    return structuredClone(report);
  }
  async updateReport(id: string, data: Partial<Report>): Promise<Report | null> {
    const r = this.findReport(id);
    if (!r) return null;
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && v !== null) (r as unknown as Record<string, unknown>)[k] = v;
    }
    r.updated_at = nowIso();
    if (r.road_segment_id) this.recalcSegment(r.road_segment_id);
    return structuredClone(r);
  }
  async deleteReport(id: string): Promise<boolean> {
    const idx = this.reports.findIndex((r) => String(r.id) === String(id));
    if (idx === -1) return false;
    const segId = this.reports[idx].road_segment_id;
    this.reports.splice(idx, 1);
    if (segId) this.recalcSegment(segId);
    return true;
  }
  async setReportStatus(id: string, status: string): Promise<Report | null> {
    return this.updateReport(id, { status: status as Report["status"] });
  }

  // --- Logs ---
  async addProcessingLog(status: string, message: string): Promise<ProcessingLog> {
    const log: ProcessingLog = {
      id: uuid(),
      execution_date: nowIso(),
      status,
      message,
      created_at: nowIso(),
    };
    this.logs.push(log);
    return structuredClone(log);
  }
  async listProcessingLogs(limit = 20): Promise<ProcessingLog[]> {
    const rows = [...this.logs].sort((a, b) =>
      b.execution_date.localeCompare(a.execution_date),
    );
    return structuredClone(rows.slice(0, limit));
  }

  // --- Alertas / seguir trecho ---
  async addFollow(data: FollowInput): Promise<Follow> {
    const follow: Follow = {
      id: uuid(),
      user_id: data.user_id ?? null,
      segment_id: data.segment_id,
      name: data.name ?? null,
      contact: data.contact ?? null,
      channel: data.channel ?? "in_app",
      created_at: nowIso(),
    };
    this.follows.push(follow);
    // Notificação de confirmação com o risco atual do trecho.
    const seg = this.findSegment(follow.segment_id);
    if (seg) this.pushNotification(seg, follow, buildFollowMessage(seg));
    return structuredClone(follow);
  }

  async listFollows(segmentId?: string, userId?: string): Promise<Follow[]> {
    let rows = this.follows;
    if (segmentId) rows = rows.filter((f) => f.segment_id === segmentId);
    if (userId) rows = rows.filter((f) => f.user_id === userId);
    return structuredClone(rows);
  }

  async removeFollow(id: string): Promise<boolean> {
    const idx = this.follows.findIndex((f) => f.id === id);
    if (idx === -1) return false;
    this.follows.splice(idx, 1);
    return true;
  }

  async listNotifications(limit = 50, userId?: string): Promise<AppNotification[]> {
    const rows = [...this.notifications]
      .filter((n) => (userId ? n.user_id === userId : true))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return structuredClone(rows.slice(0, limit));
  }

  // --- Ordens de serviço ---
  async createWorkOrder(data: WorkOrderInput): Promise<WorkOrder> {
    // Vincula automaticamente as denúncias abertas do trecho (loop de manutenção).
    let reportIds = data.report_ids ?? [];
    if (data.segment_id && reportIds.length === 0) {
      reportIds = this.reportsForSegmentSync(data.segment_id)
        .filter((r) => r.status !== "resolvida")
        .map((r) => r.id);
    }
    const wo: WorkOrder = {
      id: uuid(),
      segment_id: data.segment_id ?? null,
      title: data.title,
      status: "agendada",
      assigned_team: data.assigned_team ?? null,
      notes: data.notes ?? null,
      report_ids: reportIds,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    this.workOrders.push(wo);
    return structuredClone(wo);
  }

  async listWorkOrders(status?: string): Promise<WorkOrder[]> {
    const rows = (status ? this.workOrders.filter((w) => w.status === status) : this.workOrders)
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return structuredClone(rows);
  }

  async getWorkOrder(id: string): Promise<WorkOrder | null> {
    const wo = this.workOrders.find((w) => w.id === id);
    return wo ? structuredClone(wo) : null;
  }

  async updateWorkOrder(id: string, data: Partial<WorkOrder>): Promise<WorkOrder | null> {
    const wo = this.workOrders.find((w) => w.id === id);
    if (!wo) return null;
    const prevStatus = wo.status;
    for (const key of ["title", "status", "assigned_team", "notes", "report_ids"] as const) {
      if (data[key] !== undefined) (wo as unknown as Record<string, unknown>)[key] = data[key];
    }
    wo.updated_at = nowIso();

    // Concluir a OS: resolve denúncias vinculadas e baixa o risco do trecho.
    if (data.status === "concluida" && prevStatus !== "concluida") {
      for (const rid of wo.report_ids) {
        const r = this.findReport(rid);
        if (r) {
          r.status = "resolvida";
          r.updated_at = nowIso();
          if (r.road_segment_id) this.recalcSegment(r.road_segment_id);
        }
      }
      if (wo.segment_id) this.recalcSegment(wo.segment_id);
    }
    return structuredClone(wo);
  }
}
