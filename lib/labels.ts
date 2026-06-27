/** Rótulos em português dos enums de domínio (UI). */
import type {
  AlertChannel,
  ReportCategory,
  ReportSeverity,
  ReportStatus,
  RiskLevel,
  WorkOrderStatus,
} from "@/lib/types";

export const RISK_LABELS: Record<RiskLevel, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  critico: "Crítico",
};

export const CHANNEL_LABELS: Record<AlertChannel, string> = {
  in_app: "No app",
  email: "E-mail",
  whatsapp: "WhatsApp",
};

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  agendada: "Agendada",
  em_execucao: "Em execução",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  buraco: "Buraco",
  lama: "Lama",
  erosao: "Erosão",
  ponte_danificada: "Ponte danificada",
  atolamento: "Atolamento",
  outro: "Outro",
};

export const SEVERITY_LABELS: Record<ReportSeverity, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  aberta: "Aberta",
  em_analise: "Em análise",
  resolvida: "Resolvida",
};

/** Origem da denúncia: com conta (user_id) vs anônima (user_id null). */
export const ORIGIN_LABELS = {
  with_account: "Com conta",
  anonymous: "Anônima",
} as const;

/**
 * Veredito em linguagem leiga para o produtor (tela /resumo), derivado do
 * `risk_level`. Evita o número 0–100 (que é risco, "maior = pior", e confunde).
 */
export const PASSABILITY_VERDICT: Record<RiskLevel, { emoji: string; titulo: string; sub: string }> = {
  baixo: { emoji: "🟢", titulo: "Boa passagem", sub: "Dá pra trafegar normalmente." },
  medio: { emoji: "🟡", titulo: "Passa com atenção", sub: "Tem pontos que pedem cuidado." },
  alto: { emoji: "🟠", titulo: "Passagem difícil", sub: "Evite se puder — risco de atolar." },
  critico: { emoji: "🔴", titulo: "Risco de ficar preso", sub: "Quase intransitável agora." },
};

/** O que acontece com a denúncia em cada status (linguagem para o cidadão). */
export const STATUS_NEXT: Record<ReportStatus, string> = {
  aberta: "Recebemos sua denúncia. Em breve a equipe vai avaliar.",
  em_analise: "A equipe está avaliando o que você relatou.",
  resolvida: "Problema resolvido. Obrigado por avisar!",
};
