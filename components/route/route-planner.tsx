"use client";

import { useMemo, useState } from "react";
import { Navigation, Route as RouteIcon } from "lucide-react";

import { RiskBadge } from "@/components/risk-badge";
import { Card, CardContent } from "@/components/ui/card";
import { RISK_COLORS } from "@/lib/risk";
import { computeRoute } from "@/lib/services/route-planner";
import type { Segment } from "@/lib/types";

const RATING_COLOR: Record<string, string> = {
  boa: "hsl(var(--risk-baixo))",
  moderada: "hsl(var(--risk-medio))",
  ruim: "hsl(var(--risk-critico))",
};

export function RoutePlanner({ segments }: { segments: Segment[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectedSegments = useMemo(
    () => segments.filter((s) => selected.has(s.id)),
    [segments, selected],
  );
  const route = useMemo(() => computeRoute(selectedSegments), [selectedSegments]);
  const maxProjected = Math.max(1, ...route.days.map((d) => d.projected));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* Seleção de trechos */}
      <Card className="h-fit">
        <CardContent className="flex flex-col gap-3 p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <RouteIcon className="h-4 w-4" /> Monte seu trajeto
          </h2>
          <p className="text-xs text-muted-foreground">
            Marque os trechos pelos quais você vai passar.
          </p>
          <ul className="flex flex-col divide-y">
            {segments.map((s) => (
              <li key={s.id}>
                <label className="flex cursor-pointer items-center gap-3 py-2.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{s.name}</span>
                    <span className="block text-xs text-muted-foreground">{s.rural_line}</span>
                  </span>
                  <RiskBadge level={s.risk_level} />
                </label>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Resultado */}
      <div className="flex flex-col gap-4">
        {route.segments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
              <Navigation className="h-10 w-10" />
              <p>{route.recommendation}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Passabilidade geral */}
            <Card>
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-semibold">Passabilidade do trajeto</h2>
                  {route.overall_level && (
                    <div className="flex items-center gap-2">
                      <span
                        className="text-2xl font-bold"
                        style={{ color: RISK_COLORS[route.overall_level] }}
                      >
                        {route.overall_score.toFixed(0)}
                      </span>
                      <RiskBadge level={route.overall_level} />
                    </div>
                  )}
                </div>
                <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3">
                  <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm leading-relaxed">{route.recommendation}</p>
                </div>
              </CardContent>
            </Card>

            {/* Janela do trajeto */}
            {route.days.length > 0 && (
              <Card>
                <CardContent className="flex flex-col gap-2 p-5">
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    Melhor janela do trajeto (próximos 7 dias)
                  </h2>
                  <div className="flex items-end justify-between gap-1.5" style={{ height: 80 }}>
                    {route.days.map((d) => {
                      const isBest = d.date === route.best_day;
                      return (
                        <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">
                            {d.projected.toFixed(0)}
                          </span>
                          <div
                            className="w-full rounded-t"
                            style={{
                              height: `${(d.projected / maxProjected) * 44 + 4}px`,
                              backgroundColor: RATING_COLOR[d.rating],
                              outline: isBest ? "2px solid hsl(var(--primary))" : "none",
                              outlineOffset: 1,
                            }}
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
                </CardContent>
              </Card>
            )}

            {/* Trechos do trajeto */}
            <Card>
              <CardContent className="flex flex-col gap-2 p-5">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Trechos do trajeto ({route.segments.length})
                </h2>
                <ul className="flex flex-col divide-y">
                  {route.segments.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                      <span className="text-sm">
                        {s.name}{" "}
                        <span className="text-xs text-muted-foreground">({s.rural_line})</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: RISK_COLORS[s.risk_level] }}
                        >
                          {s.risk_score.toFixed(0)}
                        </span>
                        <RiskBadge level={s.risk_level} />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
