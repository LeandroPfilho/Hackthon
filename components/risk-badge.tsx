import { RISK_BADGE_CLASSES, RISK_COLORS, RISK_LABELS } from "@/lib/risk";
import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Selo de nível de risco com ponto colorido (Baixo/Médio/Alto/Crítico). */
export function RiskBadge({
  level,
  className,
}: {
  level: RiskLevel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        RISK_BADGE_CLASSES[level],
        className,
      )}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: RISK_COLORS[level] }}
      />
      {RISK_LABELS[level]}
    </span>
  );
}
