"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  ClipboardList,
  Download,
  FileText,
  FilterX,
  Gauge,
  ListChecks,
  MapPinned,
} from "lucide-react";

import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildSummary,
  criticalSegments as computeCriticalSegments,
  type DashboardFilters,
  filterReports,
  filterSegments,
  heatPoints,
  reportsByCategory,
} from "@/lib/services/dashboard";
import {
  CATEGORY_LABELS,
  ORIGIN_LABELS,
  RISK_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
} from "@/lib/labels";
import { RISK_COLORS } from "@/lib/risk";
import {
  REPORT_CATEGORIES,
  REPORT_STATUSES,
  RISK_LEVELS,
  type Report,
  type Segment,
} from "@/lib/types";

const fieldClass =
  "h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const HeatmapMap = dynamic(() => import("./heatmap-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Carregando mapa…
    </div>
  ),
});

const PERIODS = [
  { value: "all", label: "Todo o período" },
  { value: "1", label: "Últimas 24h" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
];

const PAGE_SIZE = 25;

type SortKey = "created_at" | "rural_line" | "category" | "severity" | "status" | "origin";
const SEVERITY_ORDER: Record<string, number> = { baixa: 0, media: 1, alta: 2, critica: 3 };

/** Comparador de duas denúncias para a coluna ordenada (ascendente). */
function sortValue(a: Report, b: Report, key: SortKey, segMap: Map<string, Segment>): number {
  switch (key) {
    case "rural_line":
      return (segMap.get(String(a.road_segment_id))?.rural_line ?? "").localeCompare(
        segMap.get(String(b.road_segment_id))?.rural_line ?? "",
      );
    case "category":
      return (CATEGORY_LABELS[a.category] ?? "").localeCompare(CATEGORY_LABELS[b.category] ?? "");
    case "severity":
      return (SEVERITY_ORDER[a.severity] ?? 0) - (SEVERITY_ORDER[b.severity] ?? 0);
    case "status":
      return a.status.localeCompare(b.status);
    case "origin":
      return Number(a.user_id == null) - Number(b.user_id == null);
    case "created_at":
    default:
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function DashboardView({
  reports,
  segments,
}: {
  reports: Report[];
  segments: Segment[];
}) {
  const [ruralLine, setRuralLine] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [period, setPeriod] = useState("all");
  const [origin, setOrigin] = useState(""); // "" | "with_account" | "anonymous"

  const segMap = useMemo(
    () => new Map(segments.map((s) => [String(s.id), s])),
    [segments],
  );
  const ruralLines = useMemo(
    () => Array.from(new Set(segments.map((s) => s.rural_line))).sort(),
    [segments],
  );

  const filters = useMemo<DashboardFilters>(
    () => ({ ruralLine, riskLevel, status, category, origin, period }),
    [ruralLine, riskLevel, status, category, origin, period],
  );

  // Tudo abaixo reage aos filtros: tabela, mapa de calor, cards, gráfico e críticos.
  const filtered = useMemo(
    () => filterReports(reports, segments, filters),
    [reports, segments, filters],
  );
  const filteredSegments = useMemo(
    () => filterSegments(segments, filters),
    [segments, filters],
  );
  const summary = useMemo(
    () => buildSummary(filteredSegments, filtered),
    [filteredSegments, filtered],
  );
  const criticals = useMemo(
    () => computeCriticalSegments(filteredSegments),
    [filteredSegments],
  );
  const categoryCounts = useMemo(() => reportsByCategory(filtered), [filtered]);
  const points = useMemo(() => heatPoints(filtered), [filtered]);
  const maxCat = Math.max(1, ...categoryCounts.map((c) => c.count));

  const hasActiveFilters = Boolean(
    ruralLine || riskLevel || status || category || origin || period !== "all",
  );
  function clearFilters() {
    setRuralLine("");
    setRiskLevel("");
    setStatus("");
    setCategory("");
    setOrigin("");
    setPeriod("all");
  }
  const csvHref = useMemo(() => {
    const qs = new URLSearchParams();
    if (ruralLine) qs.set("rural_line", ruralLine);
    if (riskLevel) qs.set("risk_level", riskLevel);
    if (status) qs.set("status", status);
    if (category) qs.set("category", category);
    if (origin) qs.set("origin", origin);
    if (period !== "all") qs.set("period", period);
    const q = qs.toString();
    return `/api/dashboard/export-csv${q ? `?${q}` : ""}`;
  }, [ruralLine, riskLevel, status, category, origin, period]);

  // Ordenação da tabela (clique no cabeçalho).
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "created_at" ? "desc" : "asc");
    }
  }
  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => sortValue(a, b, sortKey, segMap) * dir);
  }, [filtered, sortKey, sortDir, segMap]);

  // Paginação leve: começa em PAGE_SIZE e cresce sob demanda; reseta ao mudar filtro/ordem.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => setVisibleCount(PAGE_SIZE), [filters, sortKey, sortDir]);
  const paged = sorted.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho + ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard da Secretaria</h1>
          <p className="text-muted-foreground">
            Priorize a manutenção preventiva das linhas vicinais de Ariquemes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/ordens">
              <ClipboardList /> Ordens de serviço
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href={csvHref} download>
              <Download /> Exportar CSV{hasActiveFilters ? " (filtrado)" : ""}
            </a>
          </Button>
          <Button asChild>
            <Link href="/relatorios">
              <FileText /> Relatório semanal
            </Link>
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={<MapPinned />} label="Trechos monitorados" value={summary.total_segments} />
        <StatCard
          icon={<AlertTriangle />}
          label="Trechos críticos"
          value={summary.critical_segments}
          danger
        />
        <StatCard icon={<ListChecks />} label="Ocorrências abertas" value={summary.open_reports} />
        <StatCard
          icon={<ListChecks />}
          label="Ocorrências resolvidas"
          value={summary.resolved_reports}
        />
        <StatCard icon={<Gauge />} label="Índice médio" value={summary.average_index} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lista priorizada de críticos */}
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <h2 className="font-semibold">Trechos prioritários</h2>
            {criticals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum trecho crítico no momento.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {criticals.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.rural_line}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: RISK_COLORS[s.risk_level] }}>
                        {s.risk_score.toFixed(0)}
                      </span>
                      <RiskBadge level={s.risk_level} />
                      <Link
                        href={`/ordens?segment=${s.id}`}
                        className="rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        Criar OS
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Ocorrências por categoria */}
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <h2 className="font-semibold">Ocorrências por categoria</h2>
            {categoryCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem ocorrências registradas.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {categoryCounts.map((c) => {
                  const activeCat = category === c.category;
                  return (
                    <li key={c.category}>
                      <button
                        type="button"
                        onClick={() => setCategory(activeCat ? "" : c.category)}
                        title={activeCat ? "Remover filtro de categoria" : "Filtrar por esta categoria"}
                        className={`flex w-full flex-col gap-1 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-accent ${
                          activeCat ? "bg-accent" : ""
                        }`}
                      >
                        <div className="flex justify-between text-sm">
                          <span>{CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] ?? c.category}</span>
                          <span className="text-muted-foreground">{c.count}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${(c.count / maxCat) * 100}%` }}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mapa de calor */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <h2 className="font-semibold">Mapa de calor das denúncias</h2>
          <div className="h-[320px] w-full overflow-hidden rounded-lg border">
            {points.length > 0 ? (
              <HeatmapMap points={points} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Nenhuma denúncia georreferenciada no filtro atual.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de ocorrências + filtros */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Ocorrências recentes</h2>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                Mostrando {filtered.length} de {reports.length}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <FilterX className="h-3.5 w-3.5" /> Limpar filtros
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <select className={fieldClass} value={ruralLine} onChange={(e) => setRuralLine(e.target.value)}>
              <option value="">Todas as linhas</option>
              {ruralLines.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <select className={fieldClass} value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}>
              <option value="">Todos os riscos</option>
              {RISK_LEVELS.map((l) => (
                <option key={l} value={l}>{RISK_LABELS[l]}</option>
              ))}
            </select>
            <select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {REPORT_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <select className={fieldClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Todas as categorias</option>
              {REPORT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <select className={fieldClass} value={origin} onChange={(e) => setOrigin(e.target.value)}>
              <option value="">Todas as origens</option>
              <option value="with_account">{ORIGIN_LABELS.with_account}</option>
              <option value="anonymous">{ORIGIN_LABELS.anonymous}</option>
            </select>
            <select className={fieldClass} value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <SortHeader label="Data" field="created_at" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Trecho" field="rural_line" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Categoria" field="category" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Severidade" field="severity" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Status" field="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Origem" field="origin" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th className="py-2 font-medium">Relator</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      Nenhuma ocorrência para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  paged.map((r) => {
                    const seg = r.road_segment_id ? segMap.get(String(r.road_segment_id)) : undefined;
                    return (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                          {formatDateTime(r.created_at)}
                        </td>
                        <td className="py-2 pr-3">{seg?.rural_line ?? "—"}</td>
                        <td className="py-2 pr-3">{CATEGORY_LABELS[r.category]}</td>
                        <td className="py-2 pr-3">{SEVERITY_LABELS[r.severity]}</td>
                        <td className="py-2 pr-3">
                          <StatusPill status={r.status} />
                        </td>
                        <td className="py-2 pr-3">
                          <OriginBadge anonymous={r.user_id == null} />
                        </td>
                        <td className="py-2 text-muted-foreground">{r.reporter_name ?? "Anônimo"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {sorted.length > visibleCount && (
            <div className="flex justify-center pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                Ver mais ({sorted.length - visibleCount} restantes)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SortHeader({
  label,
  field,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  field: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === field;
  return (
    <th className="py-2 pr-3 font-medium">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-foreground"
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  );
}

function StatCard({
  icon,
  label,
  value,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <span
          className={
            danger
              ? "flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive [&_svg]:h-4 [&_svg]:w-4"
              : "flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:h-4 [&_svg]:w-4"
          }
        >
          {icon}
        </span>
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

function OriginBadge({ anonymous }: { anonymous: boolean }) {
  return (
    <span
      className={
        anonymous
          ? "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          : "rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
      }
    >
      {anonymous ? ORIGIN_LABELS.anonymous : ORIGIN_LABELS.with_account}
    </span>
  );
}

function StatusPill({ status }: { status: Report["status"] }) {
  const styles: Record<string, string> = {
    aberta: "bg-[hsl(var(--risk-alto)/0.14)] text-[hsl(var(--risk-alto))]",
    em_analise: "bg-[hsl(var(--risk-medio)/0.16)] text-[hsl(38_92%_38%)]",
    resolvida: "bg-[hsl(var(--risk-baixo)/0.14)] text-[hsl(var(--risk-baixo))]",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
