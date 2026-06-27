import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Gauge,
  ListChecks,
  ShieldAlert,
} from "lucide-react";

import { redirect } from "next/navigation";

import { ReportToolbar } from "@/components/report/report-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/labels";
import { getRepository } from "@/lib/repository";
import { generateWeeklySummary, WEEKLY_WINDOW_DAYS } from "@/lib/services/reporting";
import { checkSecretariaAccess } from "@/lib/supabase/auth-server";
import type { ReportCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Relatório Semanal — LinhaMap",
};

/** Relatório semanal para a Secretaria (Seção 6.7). Só Secretaria acessa. */
export default async function RelatoriosPage() {
  const access = await checkSecretariaAccess();
  if (!access.allow) redirect(access.status === 401 ? "/login?next=/relatorios" : "/?forbidden=1");

  const repo = getRepository();
  const [segments, reports] = await Promise.all([repo.listSegments(), repo.listReports()]);
  const { summary, generated_by, data } = await generateWeeklySummary(segments, reports);

  const now = new Date();
  const generatedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Porto_Velho",
  }).format(now);
  const fmtDay = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "America/Porto_Velho",
    }).format(d);
  const periodStart = new Date(now.getTime() - WEEKLY_WINDOW_DAYS * 86_400_000);
  const periodLabel = `${fmtDay(periodStart)} a ${fmtDay(now)}`;

  const categoryEntries = Object.entries(data.reports_by_category).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...categoryEntries.map(([, n]) => n));
  const regions = data.affected_regions.slice(0, 6);
  const maxReg = Math.max(1, ...regions.map((r) => r.count));

  return (
    <div className="container max-w-4xl py-10">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Relatório semanal</h1>
          <p className="text-muted-foreground">
            Trafegabilidade das linhas vicinais de Ariquemes/RO — pronto para ata, ofício ou
            apresentação.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-0.5 font-medium text-secondary-foreground">
              <CalendarDays className="h-3.5 w-3.5" /> Período: {periodLabel} (últimos{" "}
              {WEEKLY_WINDOW_DAYS} dias)
            </span>
            <span className="rounded-full bg-secondary px-3 py-0.5 font-medium text-secondary-foreground">
              Gerado em {generatedAt}
            </span>
            <span className="rounded-full bg-secondary px-3 py-0.5 font-medium text-secondary-foreground">
              Por: {generated_by === "ia" ? "Inteligência Artificial" : "lógica do sistema"}
            </span>
          </div>
        </div>
        <div className="print:hidden">
          <ReportToolbar text={summary} />
        </div>
      </div>

      {/* Faixa de KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi icon={<AlertTriangle />} label="Trechos críticos" value={data.critical_count} danger />
        <Kpi icon={<ShieldAlert />} label="Trechos em alerta" value={data.high_count} />
        <Kpi icon={<Gauge />} label="Índice médio" value={data.average_index} />
        <Kpi icon={<ListChecks />} label="Denúncias abertas" value={data.reports_open} />
        <Kpi icon={<Clock />} label="Em análise" value={data.reports_in_analysis} />
        <Kpi icon={<CheckCircle2 />} label="Resolvidas" value={data.reports_resolved} />
      </div>

      {/* Resumo textual */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <p className="whitespace-pre-line leading-relaxed text-foreground">{summary}</p>
        </CardContent>
      </Card>

      {/* Indicadores estruturados */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <h2 className="font-semibold">Trechos críticos prioritários</h2>
            {data.critical_segments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum trecho crítico.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {data.critical_segments.map((s) => (
                  <li
                    key={`${s.rural_line}-${s.name}`}
                    className="flex justify-between gap-2 py-2 text-sm"
                  >
                    <span>
                      {s.name} <span className="text-muted-foreground">({s.rural_line})</span>
                    </span>
                    <span className="font-semibold capitalize">{s.risk_level}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <h2 className="font-semibold">Ocorrências por categoria</h2>
            {categoryEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem ocorrências registradas.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {categoryEntries.map(([cat, n]) => (
                  <li key={cat} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span>{CATEGORY_LABELS[cat as ReportCategory] ?? cat}</span>
                      <span className="text-muted-foreground">{n}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(n / maxCat) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <h2 className="font-semibold">Regiões mais afetadas</h2>
            {regions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem relatos por região.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {regions.map((r) => (
                  <li key={r.rural_line} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span>{r.rural_line}</span>
                      <span className="text-muted-foreground">{r.count} relato(s)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(r.count / maxReg) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <h2 className="font-semibold">Recomendações de prioridade</h2>
            {data.priority_recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem recomendações no momento.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {data.priority_recommendations.map((rec) => (
                  <li key={rec} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {rec}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
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
