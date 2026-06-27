/**
 * Helpers da escala de risco (rótulos, cores e classes de badge).
 * As cores espelham as CSS vars de globals.css para o mapa e a UI ficarem iguais.
 */
import type { RiskLevel } from "@/lib/types";

export const RISK_LABELS: Record<RiskLevel, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  critico: "Crítico",
};

/** Cores concretas (hsl) — usadas em Leaflet/gráficos onde CSS vars não chegam. */
export const RISK_COLORS: Record<RiskLevel, string> = {
  baixo: "hsl(142 71% 38%)",
  medio: "hsl(45 93% 47%)",
  alto: "hsl(25 95% 53%)",
  critico: "hsl(0 74% 47%)",
};

/**
 * Classes Tailwind por nível (strings estáticas para o JIT detectar).
 * Fundo suave + texto/anel na cor do risco — visual de status limpo.
 */
export const RISK_BADGE_CLASSES: Record<RiskLevel, string> = {
  baixo: "bg-[hsl(var(--risk-baixo)/0.12)] text-[hsl(var(--risk-baixo))] ring-[hsl(var(--risk-baixo)/0.25)]",
  medio: "bg-[hsl(var(--risk-medio)/0.14)] text-[hsl(38_92%_38%)] ring-[hsl(var(--risk-medio)/0.3)]",
  alto: "bg-[hsl(var(--risk-alto)/0.14)] text-[hsl(var(--risk-alto))] ring-[hsl(var(--risk-alto)/0.3)]",
  critico: "bg-[hsl(var(--risk-critico)/0.12)] text-[hsl(var(--risk-critico))] ring-[hsl(var(--risk-critico)/0.25)]",
};

export function riskLabel(level: RiskLevel): string {
  return RISK_LABELS[level] ?? level;
}
