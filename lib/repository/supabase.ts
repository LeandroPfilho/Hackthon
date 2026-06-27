/**
 * Repositório Supabase — porte de SupabaseRepository (repository.py).
 *
 * A geometria PostGIS é alimentada via SQL/seed; a API usa a coluna
 * `coordinates` (jsonb) para o traçado. Será exercitado quando houver um
 * projeto Supabase (modo real); em desenvolvimento usamos o MockRepository.
 */
import { config } from "@/lib/config";
import { buildAlertMessage, buildFollowMessage, shouldAlert } from "@/lib/services/alerts";
import { getSupabaseAdmin } from "@/lib/supabase/server";
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

const SEGMENTS = "road_segments";
const REPORTS = "reports";
const LOGS = "processing_logs";
const FOLLOWS = "follows";
const NOTIFICATIONS = "notifications";
const WORK_ORDERS = "work_orders";

export class SupabaseRepository implements Repository {
  private db = getSupabaseAdmin();

  // --- Trechos ---
  async listSegments(): Promise<Segment[]> {
    const { data, error } = await this.db.from(SEGMENTS).select("*");
    if (error) throw error;
    return (data ?? []) as Segment[];
  }
  async getSegment(id: string): Promise<Segment | null> {
    const { data } = await this.db.from(SEGMENTS).select("*").eq("id", id).limit(1);
    return (data?.[0] as Segment) ?? null;
  }
  async createSegment(input: Partial<Segment>): Promise<Segment> {
    const payload = { ...input, ...scoreFields(input, []) };
    const { data, error } = await this.db.from(SEGMENTS).insert(payload).select();
    if (error) throw error;
    return data![0] as Segment;
  }
  async updateSegment(id: string, input: Partial<Segment>): Promise<Segment | null> {
    const existing = await this.getSegment(id);
    if (!existing) return null;
    const merged = { ...existing, ...input };
    const fields = scoreFields(merged, await this.reportsForSegment(id));
    const { geometry, ...clean } = { ...merged, ...fields } as Record<string, unknown>;
    const { data, error } = await this.db.from(SEGMENTS).update(clean).eq("id", id).select();
    if (error) throw error;
    return (data?.[0] as Segment) ?? null;
  }
  async deleteSegment(id: string): Promise<boolean> {
    const { data, error } = await this.db.from(SEGMENTS).delete().eq("id", id).select();
    if (error) throw error;
    return Boolean(data && data.length);
  }
  async reportsForSegment(id: string): Promise<Report[]> {
    const { data } = await this.db.from(REPORTS).select("*").eq("road_segment_id", id);
    return (data ?? []) as Report[];
  }
  async recalculateAll(): Promise<number> {
    const segments = await this.listSegments();
    // Modo demo: não sobrescreve os valores curados (cron vira no-op de escrita).
    if (config.demoMode) return segments.length;
    for (const seg of segments) {
      const prev = seg.risk_level;
      const fields = scoreFields(seg, await this.reportsForSegment(seg.id));
      await this.db.from(SEGMENTS).update(fields).eq("id", seg.id);
      await this.notifyFollowers({ ...seg, ...fields } as Segment, prev);
    }
    return segments.length;
  }

  // --- Denúncias ---
  async listReports(filters: ReportFilters = {}): Promise<Report[]> {
    let query = this.db.from(REPORTS).select("*");
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.category) query = query.eq("category", filters.category);
    if (filters.road_segment_id) query = query.eq("road_segment_id", filters.road_segment_id);
    if (filters.user_id) query = query.eq("user_id", filters.user_id);
    const { data } = await query.order("created_at", { ascending: false });
    return (data ?? []) as Report[];
  }
  async getReport(id: string): Promise<Report | null> {
    const { data } = await this.db.from(REPORTS).select("*").eq("id", id).limit(1);
    return (data?.[0] as Report) ?? null;
  }
  async createReport(input: Partial<Report>): Promise<Report> {
    const { data, error } = await this.db.from(REPORTS).insert(input).select();
    if (error) throw error;
    const row = data![0] as Report;
    if (row.road_segment_id) await this.recalcSegment(row.road_segment_id);
    return row;
  }
  async updateReport(id: string, input: Partial<Report>): Promise<Report | null> {
    const { data, error } = await this.db.from(REPORTS).update(input).eq("id", id).select();
    if (error) throw error;
    const row = (data?.[0] as Report) ?? null;
    if (row?.road_segment_id) await this.recalcSegment(row.road_segment_id);
    return row;
  }
  async deleteReport(id: string): Promise<boolean> {
    const existing = await this.getReport(id);
    const { data, error } = await this.db.from(REPORTS).delete().eq("id", id).select();
    if (error) throw error;
    if (existing?.road_segment_id) await this.recalcSegment(existing.road_segment_id);
    return Boolean(data && data.length);
  }
  async setReportStatus(id: string, status: string): Promise<Report | null> {
    return this.updateReport(id, { status: status as Report["status"] });
  }

  // --- Logs ---
  async addProcessingLog(status: string, message: string): Promise<ProcessingLog> {
    const { data, error } = await this.db
      .from(LOGS)
      .insert({ status, message })
      .select();
    if (error) throw error;
    return data![0] as ProcessingLog;
  }
  async listProcessingLogs(limit = 20): Promise<ProcessingLog[]> {
    const { data } = await this.db
      .from(LOGS)
      .select("*")
      .order("execution_date", { ascending: false })
      .limit(limit);
    return (data ?? []) as ProcessingLog[];
  }

  private async recalcSegment(id: string): Promise<void> {
    // Modo demo: não sobrescreve os valores curados (denúncia não erode o score).
    // Alinha o recálculo do create/update/delete ao comportamento do cron (recalculateAll).
    if (config.demoMode) return;
    const seg = await this.getSegment(id);
    if (!seg) return;
    const prev = seg.risk_level;
    const fields = scoreFields(seg, await this.reportsForSegment(id));
    await this.db.from(SEGMENTS).update(fields).eq("id", id);
    await this.notifyFollowers({ ...seg, ...fields } as Segment, prev);
  }

  // --- Alertas / seguir trecho ---
  private async notifyFollowers(seg: Segment, prev: RiskLevel): Promise<void> {
    if (!shouldAlert(prev, seg.risk_level)) return;
    const follows = await this.listFollows(seg.id);
    if (!follows.length) return;
    const rows = follows.map((f) => ({
      user_id: f.user_id ?? null,
      segment_id: seg.id,
      segment_name: seg.name,
      contact: f.contact,
      channel: f.channel,
      level: seg.risk_level,
      message: buildAlertMessage(seg),
      status: f.channel === "in_app" ? "in_app" : "simulada",
    }));
    await this.db.from(NOTIFICATIONS).insert(rows);
  }

  async addFollow(data: FollowInput): Promise<Follow> {
    // Evita inscrição duplicada do mesmo usuário no mesmo trecho.
    if (data.user_id) {
      const existing = await this.db
        .from(FOLLOWS)
        .select("*")
        .eq("user_id", data.user_id)
        .eq("segment_id", data.segment_id)
        .limit(1);
      if (existing.data?.[0]) return existing.data[0] as Follow;
    }
    const payload = {
      user_id: data.user_id ?? null,
      segment_id: data.segment_id,
      road_segment_id: data.segment_id,
      name: data.name ?? null,
      contact: data.contact ?? null,
      channel: data.channel ?? "in_app",
    };
    const { data: rows, error } = await this.db.from(FOLLOWS).insert(payload).select();
    if (error) throw error;
    const follow = rows![0] as Follow;
    const seg = await this.getSegment(follow.segment_id);
    if (seg) {
      await this.db.from(NOTIFICATIONS).insert({
        user_id: follow.user_id ?? null,
        segment_id: seg.id,
        segment_name: seg.name,
        contact: follow.contact,
        channel: follow.channel,
        level: seg.risk_level,
        message: buildFollowMessage(seg),
        status: follow.channel === "in_app" ? "in_app" : "simulada",
      });
    }
    return follow;
  }

  async listFollows(segmentId?: string, userId?: string): Promise<Follow[]> {
    let query = this.db.from(FOLLOWS).select("*");
    if (segmentId) query = query.eq("segment_id", segmentId);
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query;
    return (data ?? []) as Follow[];
  }

  async removeFollow(id: string): Promise<boolean> {
    const { data } = await this.db.from(FOLLOWS).delete().eq("id", id).select();
    return Boolean(data && data.length);
  }

  async listNotifications(limit = 50, userId?: string): Promise<AppNotification[]> {
    let query = this.db.from(NOTIFICATIONS).select("*");
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query.order("created_at", { ascending: false }).limit(limit);
    return (data ?? []) as AppNotification[];
  }

  // --- Ordens de serviço ---
  async createWorkOrder(data: WorkOrderInput): Promise<WorkOrder> {
    let reportIds = data.report_ids ?? [];
    if (data.segment_id && reportIds.length === 0) {
      const reps = await this.reportsForSegment(data.segment_id);
      reportIds = reps.filter((r) => r.status !== "resolvida").map((r) => r.id);
    }
    const payload = {
      segment_id: data.segment_id ?? null,
      title: data.title,
      status: "agendada",
      assigned_team: data.assigned_team ?? null,
      notes: data.notes ?? null,
      report_ids: reportIds,
    };
    const { data: rows, error } = await this.db.from(WORK_ORDERS).insert(payload).select();
    if (error) throw error;
    return rows![0] as WorkOrder;
  }

  async listWorkOrders(status?: string): Promise<WorkOrder[]> {
    let query = this.db.from(WORK_ORDERS).select("*");
    if (status) query = query.eq("status", status);
    const { data } = await query.order("created_at", { ascending: false });
    return (data ?? []) as WorkOrder[];
  }

  async getWorkOrder(id: string): Promise<WorkOrder | null> {
    const { data } = await this.db.from(WORK_ORDERS).select("*").eq("id", id).limit(1);
    return (data?.[0] as WorkOrder) ?? null;
  }

  async updateWorkOrder(id: string, data: Partial<WorkOrder>): Promise<WorkOrder | null> {
    const existing = await this.getWorkOrder(id);
    if (!existing) return null;
    const clean: Record<string, unknown> = {};
    for (const key of ["title", "status", "assigned_team", "notes", "report_ids"] as const) {
      if (data[key] !== undefined) clean[key] = data[key];
    }
    const { data: rows, error } = await this.db
      .from(WORK_ORDERS)
      .update(clean)
      .eq("id", id)
      .select();
    if (error) throw error;
    const wo = rows![0] as WorkOrder;

    if (data.status === "concluida" && existing.status !== "concluida") {
      for (const rid of wo.report_ids ?? []) {
        await this.db.from(REPORTS).update({ status: "resolvida" }).eq("id", rid);
        const rep = await this.getReport(rid);
        if (rep?.road_segment_id) await this.recalcSegment(rep.road_segment_id);
      }
      if (wo.segment_id) await this.recalcSegment(wo.segment_id);
    }
    return wo;
  }
}
