/**
 * Lógica de alertas: decide quando notificar e monta a mensagem.
 * O envio real por e-mail/WhatsApp é simulado no MVP (sem custo) — as
 * notificações ficam registradas e visíveis na central in-app.
 */
import { LEVEL_RANK, type RiskLevel, type Segment } from "@/lib/types";

/** Notifica quando o risco piora E chega a alto/crítico. */
export function shouldAlert(prev: RiskLevel, next: RiskLevel): boolean {
  const worsened = LEVEL_RANK[next] > LEVEL_RANK[prev];
  return worsened && (next === "alto" || next === "critico");
}

/** Mensagem do alerta de piora de um trecho. */
export function buildAlertMessage(segment: Segment): string {
  const base = `⚠️ O trecho ${segment.name} (${segment.rural_line}) passou para risco ${segment.risk_level}.`;
  return segment.explanation ? `${base} ${segment.explanation}` : base;
}

/** Mensagem de confirmação ao começar a seguir um trecho. */
export function buildFollowMessage(segment: Segment): string {
  return `Você começou a acompanhar ${segment.name} (${segment.rural_line}). Risco atual: ${segment.risk_level}.`;
}
