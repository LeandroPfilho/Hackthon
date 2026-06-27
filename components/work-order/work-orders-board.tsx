"use client";

import { useMemo, useState } from "react";
import { ClipboardList, LoaderCircle, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { advanceWorkOrder, createWorkOrder, getWorkOrders } from "@/lib/api-client";
import { WORK_ORDER_STATUS_LABELS } from "@/lib/labels";
import type { WorkOrder, WorkOrderStatus } from "@/lib/types";

const fieldClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const COLUMNS: { status: WorkOrderStatus; color: string }[] = [
  { status: "agendada", color: "hsl(var(--risk-medio))" },
  { status: "em_execucao", color: "hsl(var(--risk-alto))" },
  { status: "concluida", color: "hsl(var(--risk-baixo))" },
];

type SegmentOption = { id: string; name: string; rural_line: string };

export function WorkOrdersBoard({
  initial,
  segments,
  preselectedSegmentId,
}: {
  initial: WorkOrder[];
  segments: SegmentOption[];
  preselectedSegmentId?: string;
}) {
  const [orders, setOrders] = useState<WorkOrder[]>(initial);
  const [title, setTitle] = useState("");
  const [segmentId, setSegmentId] = useState(preselectedSegmentId ?? "");
  const [team, setTeam] = useState("");
  const [busy, setBusy] = useState(false);

  const segName = useMemo(
    () => new Map(segments.map((s) => [s.id, `${s.rural_line} — ${s.name}`])),
    [segments],
  );

  async function refresh() {
    setOrders(await getWorkOrders());
  }

  async function create() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await createWorkOrder({
        title,
        segment_id: segmentId || null,
        assigned_team: team || null,
      });
      setTitle("");
      setTeam("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function advance(id: string, status: WorkOrderStatus) {
    setBusy(true);
    try {
      await advanceWorkOrder(id, status);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Nova OS */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Plus className="h-4 w-4" /> Nova ordem de serviço
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Título (ex.: Recompor leito da ponte)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select
              className={fieldClass}
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
            >
              <option value="">Trecho (opcional)</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.rural_line} — {s.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Equipe responsável"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            />
          </div>
          <Button onClick={create} disabled={busy || !title.trim()} className="w-fit">
            {busy ? <LoaderCircle className="animate-spin" /> : <Plus />} Criar OS
          </Button>
        </CardContent>
      </Card>

      {/* Quadro */}
      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = orders.filter((o) => o.status === col.status);
          return (
            <div key={col.status} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: col.color }} />
                <h3 className="font-semibold">{WORK_ORDER_STATUS_LABELS[col.status]}</h3>
                <span className="text-sm text-muted-foreground">({items.length})</span>
              </div>
              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Nenhuma ordem aqui.
                </p>
              ) : (
                items.map((o) => (
                  <Card key={o.id}>
                    <CardContent className="flex flex-col gap-2 p-4">
                      <p className="font-medium">{o.title}</p>
                      {o.segment_id && (
                        <p className="text-xs text-muted-foreground">
                          {segName.get(o.segment_id) ?? "Trecho"}
                        </p>
                      )}
                      {o.assigned_team && (
                        <p className="text-xs text-muted-foreground">Equipe: {o.assigned_team}</p>
                      )}
                      <div className="flex gap-2 pt-1">
                        {o.status === "agendada" && (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => advance(o.id, "em_execucao")}>
                            Iniciar
                          </Button>
                        )}
                        {o.status === "em_execucao" && (
                          <Button size="sm" disabled={busy} onClick={() => advance(o.id, "concluida")}>
                            Concluir
                          </Button>
                        )}
                        {o.status === "concluida" && (
                          <span className="text-xs font-medium text-[hsl(var(--risk-baixo))]">
                            ✓ Risco do trecho atualizado
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          );
        })}
      </div>

      {orders.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
          <ClipboardList className="h-10 w-10" />
          <p className="text-sm">Crie a primeira ordem de serviço a partir de um trecho crítico.</p>
        </div>
      )}
    </div>
  );
}
