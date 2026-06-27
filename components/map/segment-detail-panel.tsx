import Link from "next/link";
import {
  CalendarCheck,
  CloudRain,
  Droplets,
  Megaphone,
  MountainSnow,
  MousePointerClick,
  Truck,
} from "lucide-react";

import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { RISK_COLORS } from "@/lib/risk";
import { computeTravelWindow, type TravelRating } from "@/lib/services/forecast";
import type { SegmentDetail } from "@/lib/types";

import { FollowButton } from "./follow-button";

const RATING_COLOR: Record<TravelRating, string> = {
  boa: "hsl(var(--risk-baixo))",
  moderada: "hsl(var(--risk-medio))",
  ruim: "hsl(var(--risk-critico))",
};

export function SegmentDetailPanel({
  detail,
  loading,
  hasSelection,
}: {
  detail: SegmentDetail | null;
  loading: boolean;
  hasSelection: boolean;
}) {
  if (!hasSelection) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
        <MousePointerClick className="h-10 w-10" />
        <p className="max-w-[220px] text-sm">
          Clique em um trecho no mapa para ver o detalhe do risco.
        </p>
      </div>
    );
  }

  if (loading || !detail) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
        Carregando detalhe…
      </div>
    );
  }

  const color = RISK_COLORS[detail.risk_level];
  const maxForecast = Math.max(1, ...(detail.forecast_daily ?? []).map((d) => d.mm));
  const travel = computeTravelWindow(detail);

  return (
    <div className="flex flex-col gap-6 p-5">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {detail.rural_line}
        </span>
        <h2 className="text-xl font-bold leading-tight">{detail.name}</h2>
        <RiskBadge level={detail.risk_level} className="w-fit" />
      </div>

      {/* Índice de Trafegabilidade */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Índice de Trafegabilidade
          </span>
          <span className="text-2xl font-bold" style={{ color }}>
            {detail.risk_score.toFixed(0)}
            <span className="text-sm font-normal text-muted-foreground">/100</span>
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${detail.risk_score}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3">
        <Metric icon={<Droplets />} label="Chuva acumulada (72h)" value={`${detail.accumulated_rain_72h.toFixed(0)} mm`} />
        <Metric icon={<CloudRain />} label="Previsão (7 dias)" value={`${detail.forecast_rain_7d.toFixed(0)} mm`} />
        <Metric icon={<MountainSnow />} label="Declividade" value={`${detail.slope.toFixed(1)}%`} />
        <Metric icon={<Megaphone />} label="Relatos recentes" value={String(detail.reports_count)} />
      </div>

      {/* Explicação */}
      {detail.explanation && (
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="text-sm leading-relaxed text-foreground">{detail.explanation}</p>
        </div>
      )}

      {/* Janela de escoamento + previsão diária */}
      {travel.days.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Truck className="h-4 w-4" /> Melhor janela para escoar
          </span>
          <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3">
            <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed">{travel.recommendation}</p>
          </div>
          <div className="flex items-end justify-between gap-1.5" style={{ height: 78 }}>
            {travel.days.map((d) => {
              const isBest = d.date === travel.bestDay;
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{d.mm.toFixed(0)}</span>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${(d.mm / maxForecast) * 40 + 4}px`,
                      backgroundColor: RATING_COLOR[d.rating],
                      outline: isBest ? "2px solid hsl(var(--primary))" : "none",
                      outlineOffset: 1,
                    }}
                    title={`${d.date}: ${d.mm} mm previstos · ${d.rating}`}
                  />
                  <span
                    className={
                      isBest
                        ? "text-[10px] font-semibold text-primary"
                        : "text-[10px] text-muted-foreground"
                    }
                  >
                    {d.date}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <Legend color={RATING_COLOR.boa} label="Boa" />
            <Legend color={RATING_COLOR.moderada} label="Moderada" />
            <Legend color={RATING_COLOR.ruim} label="Ruim" />
          </div>
        </div>
      )}

      {/* Fatores do score (transparência) */}
      {detail.factors && detail.factors.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Como o risco foi calculado
          </span>
          <ul className="flex flex-col gap-2">
            {detail.factors.map((f) => (
              <li key={f.key} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span>{f.label}</span>
                  <span className="text-muted-foreground">
                    +{f.contribution.toFixed(0)} pts
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${f.subscore}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recomendações */}
      {detail.recommendations && detail.recommendations.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Recomendações de ação
          </span>
          <ul className="flex flex-col gap-1.5">
            {detail.recommendations.map((rec) => (
              <li key={rec} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button asChild variant="outline" className="w-full">
          <Link href={`/denuncia?segment=${detail.id}`}>
            <Megaphone /> Registrar denúncia neste trecho
          </Link>
        </Button>
        <FollowButton segmentId={detail.id} />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
        {icon}
        {label}
      </span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}
