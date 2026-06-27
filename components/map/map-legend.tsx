import { RISK_COLORS, RISK_LABELS } from "@/lib/risk";
import { RISK_LEVELS } from "@/lib/types";

/** Legenda flutuante da escala de risco sobre o mapa. */
export function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] rounded-lg border bg-background/90 p-3 shadow-md backdrop-blur">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">Nível de risco</p>
      <ul className="flex flex-col gap-1.5">
        {RISK_LEVELS.map((level) => (
          <li key={level} className="flex items-center gap-2 text-xs">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: RISK_COLORS[level] }}
            />
            {RISK_LABELS[level]}
          </li>
        ))}
      </ul>
    </div>
  );
}
