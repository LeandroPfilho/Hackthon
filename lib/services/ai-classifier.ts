/**
 * Classificação automática de denúncias (Seção 6.5) — porte de ai_classifier.py.
 *
 * Dois níveis, sempre retornando o mesmo contrato:
 *   { categoria, severidade, confianca, justificativa, fonte }
 * 1) IA multimodal (Claude) quando habilitada; 2) fallback por regras.
 */
import Anthropic from "@anthropic-ai/sdk";

import { aiEnabled, config } from "@/lib/config";
import {
  type ClassificationResult,
  REPORT_CATEGORIES,
  REPORT_SEVERITIES,
  type ReportCategory,
  type ReportSeverity,
} from "@/lib/types";

// --- Regras (fallback determinístico) ---
const CATEGORY_KEYWORDS: Array<[ReportCategory, string[]]> = [
  ["ponte_danificada", ["ponte", "cabeceira", "bueiro", "pontilhao"]],
  ["atolamento", ["atol", "atolou", "atolamento", "preso no barro"]],
  ["erosao", ["erosao", "vocoroca", "vossoroca", "barranco caiu", "deslizamento"]],
  ["lama", ["lama", "lamacal", "atoleiro", "barro"]],
  ["buraco", ["buraco", "cratera", "afundou", "afundamento"]],
];

const SEVERITY_KEYWORDS: Array<[ReportSeverity, string[]]> = [
  ["critica", ["grave", "critic", "urgente", "intransit", "cedendo", "desabou", "destru", "isolad"]],
  ["alta", ["forte", "grande", "perigos", "fundo", "profund", "piorando", "crescendo"]],
  ["baixa", ["leve", "pequen", "comeca", "inicio", "da pra", "ainda passa", "desviar"]],
];

const CATEGORY_LABELS: Record<string, string> = {
  buraco: "buraco",
  lama: "lama",
  erosao: "erosão",
  ponte_danificada: "ponte danificada",
  atolamento: "atolamento",
  outro: "outro problema",
};

/** Minúsculas e sem acentos, para casar palavras-chave de forma robusta. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Classificação por palavras-chave (sempre disponível). */
export function classifyByRules(description: string | null | undefined): ClassificationResult {
  const text = normalize(description ?? "");

  let category: ReportCategory = "outro";
  let matched: string | null = null;
  for (const [cat, keywords] of CATEGORY_KEYWORDS) {
    const hit = keywords.find((kw) => text.includes(kw));
    if (hit) {
      category = cat;
      matched = hit;
      break;
    }
  }

  let severity: ReportSeverity = "media";
  for (const [sev, keywords] of SEVERITY_KEYWORDS) {
    if (keywords.some((kw) => text.includes(kw))) {
      severity = sev;
      break;
    }
  }

  const confianca = matched ? 0.6 : 0.4;
  const justificativa = matched
    ? `Classificação por regras: a descrição menciona '${matched}', indicando ${CATEGORY_LABELS[category] ?? category}.`
    : "Classificação por regras: nenhuma palavra-chave específica encontrada; categorizado como 'outro'.";

  return { categoria: category, severidade: severity, confianca, justificativa, fonte: "regras" };
}

// --- IA multimodal (Claude) ---
const SYSTEM_PROMPT =
  "Você é um classificador de ocorrências em estradas rurais (linhas vicinais). " +
  "Analise a descrição e a imagem (se houver) e responda APENAS com um JSON válido, " +
  "sem texto extra, no formato exato:\n" +
  '{"categoria": "<buraco|lama|erosao|ponte_danificada|atolamento|outro>", ' +
  '"severidade": "<baixa|media|alta|critica>", ' +
  '"confianca": <numero entre 0 e 1>, ' +
  '"justificativa": "<frase curta explicando a classificação>"}';

function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function validate(parsed: Record<string, unknown>): ClassificationResult | null {
  const categoria = parsed.categoria as ReportCategory;
  const severidade = parsed.severidade as ReportSeverity;
  if (!REPORT_CATEGORIES.includes(categoria) || !REPORT_SEVERITIES.includes(severidade)) {
    return null;
  }
  let confianca = Number(parsed.confianca ?? 0.7);
  if (Number.isNaN(confianca)) confianca = 0.7;
  confianca = Math.max(0, Math.min(1, confianca));
  return {
    categoria,
    severidade,
    confianca: Math.round(confianca * 100) / 100,
    justificativa: String(parsed.justificativa ?? "") || "Classificação por IA.",
    fonte: "ia",
  };
}

async function classifyWithAi(
  description: string | null | undefined,
  imageUrl: string | null | undefined,
): Promise<ClassificationResult | null> {
  if (!aiEnabled()) return null;
  try {
    const client = new Anthropic({ apiKey: config.anthropicApiKey });
    const content: Anthropic.ContentBlockParam[] = [
      { type: "text", text: `Descrição da denúncia: ${description ?? "(sem descrição)"}` },
    ];
    if (imageUrl) {
      content.push({ type: "image", source: { type: "url", url: imageUrl } });
    }
    const message = await client.messages.create({
      model: config.aiModelClassify,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });
    const raw = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = extractJson(raw);
    return parsed ? validate(parsed) : null;
  } catch {
    return null; // qualquer falha cai no fallback por regras
  }
}

/** Classifica uma denúncia, preferindo IA e caindo para regras. */
export async function classifyReport(
  description?: string | null,
  imageUrl?: string | null,
): Promise<ClassificationResult> {
  const ai = await classifyWithAi(description, imageUrl);
  return ai ?? classifyByRules(description);
}
