/**
 * Motor do Índice de Trafegabilidade (0-100) — porte de scoring.py.
 *
 * Regressão ponderada transparente (não caixa-preta): cada fator vira um
 * sub-score 0-100 e é combinado por pesos fixos. Sempre explica POR QUE um
 * trecho recebeu o risco (Regra de Negócio 3).
 *
 * Pesos (somam 1.0): chuva 72h 0.30 · previsão 7d 0.25 · declividade 0.15 ·
 * relatos (gravidade × recência) 0.30.
 */
import {
  type FactorBreakdown,
  type ReportSeverity,
  type RiskLevel,
  scoreToLevel,
} from "@/lib/types";

// --- Parâmetros do modelo ---
const WEIGHTS = { rain_72h: 0.3, forecast_7d: 0.25, slope: 0.15, reports: 0.3 };
const REF_RAIN_72H_MM = 100;
const REF_FORECAST_7D_MM = 150;
const REF_SLOPE_PCT = 10;
const RECENCY_WINDOW_DAYS = 14;

const SEVERITY_POINTS: Record<string, number> = {
  baixa: 15,
  media: 30,
  alta: 45,
  critica: 60,
};

const CATEGORY_LABELS: Record<string, string> = {
  buraco: "buraco",
  lama: "lama",
  erosao: "erosão",
  ponte_danificada: "ponte danificada",
  atolamento: "atolamento",
  outro: "outro problema",
};

/** Subconjunto de campos de relato que o motor usa. */
export interface ScoringReport {
  severity?: ReportSeverity | string;
  category?: string | null;
  created_at?: string | null;
}

export interface ScoreResult {
  score: number;
  level: RiskLevel;
  explanation: string;
  recommendations: string[];
  factors: FactorBreakdown[];
}

function clamp(value: number, low = 0, high = 100): number {
  return Math.max(low, Math.min(high, value));
}

function recencyFactor(createdAt: string | null | undefined, now: number): number {
  if (!createdAt) return 1;
  const dt = Date.parse(createdAt);
  if (Number.isNaN(dt)) return 1;
  const ageDays = (now - dt) / 86_400_000;
  return clamp(1 - ageDays / RECENCY_WINDOW_DAYS, 0, 1);
}

function reportsSubscore(
  reports: ScoringReport[],
  now: number,
): { subscore: number; recentCount: number; categories: string[] } {
  let total = 0;
  let recentCount = 0;
  const categories: string[] = [];
  for (const r of reports ?? []) {
    const severity = String(r.severity ?? "media");
    const base = SEVERITY_POINTS[severity] ?? SEVERITY_POINTS.media;
    const factor = recencyFactor(r.created_at, now);
    total += base * factor;
    if (factor > 0) {
      recentCount += 1;
      const cat = r.category ? String(r.category) : null;
      if (cat && !categories.includes(cat)) categories.push(cat);
    }
  }
  return { subscore: clamp(total), recentCount, categories };
}

// --- Frases (explicabilidade) ---
function joinPt(items: string[]): string {
  const arr = items.filter(Boolean);
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  return `${arr.slice(0, -1).join(", ")} e ${arr[arr.length - 1]}`;
}

function phraseRain72(v: number): string {
  return `chuva acumulada de ${v.toFixed(0)} mm nas últimas 72h`;
}
function phraseForecast(v: number): string {
  if (v >= 100) return `previsão de chuva intensa (${v.toFixed(0)} mm) para os próximos 7 dias`;
  if (v >= 50) return `previsão de chuva moderada (${v.toFixed(0)} mm) para os próximos 7 dias`;
  return `previsão de ${v.toFixed(0)} mm de chuva para os próximos 7 dias`;
}
function phraseSlope(v: number): string {
  if (v >= 7) return `declividade acentuada de ${v.toFixed(1)}%`;
  if (v >= 4) return `declividade de ${v.toFixed(1)}%`;
  return `declividade suave de ${v.toFixed(1)}%`;
}
function phraseReports(count: number, categories: string[]): string {
  const plural = count !== 1 ? "s" : "";
  const base = `${count} relato${plural} recente${plural}`;
  const cats = categories.map((c) => CATEGORY_LABELS[c] ?? c);
  return cats.length ? `${base} de ${joinPt(cats)}` : base;
}

function buildExplanation(
  level: RiskLevel,
  factors: FactorBreakdown[],
  reportCount: number,
  reportCategories: string[],
): string {
  const phrased: Array<[number, string]> = [];
  for (const f of factors) {
    if (f.contribution < 2) continue;
    if (f.key === "rain_72h") phrased.push([f.contribution, phraseRain72(f.value)]);
    else if (f.key === "forecast_7d") phrased.push([f.contribution, phraseForecast(f.value)]);
    else if (f.key === "slope") phrased.push([f.contribution, phraseSlope(f.value)]);
    else if (f.key === "reports" && reportCount > 0)
      phrased.push([f.contribution, phraseReports(reportCount, reportCategories)]);
  }
  phrased.sort((a, b) => b[0] - a[0]);
  const top = phrased.slice(0, 3).map((p) => p[1]);
  if (top.length === 0) {
    return `Risco ${level}: condições estáveis e sem relatos recentes; trafegabilidade normal.`;
  }
  return `Risco ${level} devido a ${joinPt(top)}.`;
}

export function buildRecommendations(
  level: RiskLevel,
  factors: FactorBreakdown[],
  reportCount: number,
): string[] {
  const recs: string[] = [];
  if (level === "critico") {
    recs.push(
      "Acionar a equipe de manutenção em caráter de urgência.",
      "Sinalizar o trecho e orientar rotas alternativas.",
      "Evitar o tráfego de caminhões pesados até a vistoria.",
    );
  } else if (level === "alto") {
    recs.push(
      "Programar manutenção preventiva nos próximos dias.",
      "Monitorar a evolução da chuva e novos relatos.",
    );
  } else if (level === "medio") {
    recs.push(
      "Manter o trecho sob monitoramento.",
      "Planejar manutenção preventiva conforme a previsão de chuva.",
    );
  } else {
    recs.push("Trecho transitável; manter acompanhamento de rotina.");
  }

  const slope = factors.find((f) => f.key === "slope");
  if (slope && slope.value >= 7 && level !== "baixo") {
    recs.push("Reforçar drenagem e contenção de erosão no trecho íngreme.");
  }
  if (reportCount >= 3) {
    recs.push("Priorizar vistoria de campo devido ao alto número de relatos.");
  }
  return recs;
}

/** Calcula o Índice de Trafegabilidade de um trecho de forma explicável. */
export function calculateTrafficIndex(input: {
  accumulatedRain72h?: number;
  forecastRain7d?: number;
  slope?: number;
  reports?: ScoringReport[];
  now?: number;
}): ScoreResult {
  const accumulatedRain72h = input.accumulatedRain72h ?? 0;
  const forecastRain7d = input.forecastRain7d ?? 0;
  const slope = input.slope ?? 0;
  const reports = input.reports ?? [];
  const now = input.now ?? Date.now();

  // 1) Normalização.
  const subRain72 = clamp((accumulatedRain72h / REF_RAIN_72H_MM) * 100);
  const subForecast = clamp((forecastRain7d / REF_FORECAST_7D_MM) * 100);
  const subSlope = clamp((slope / REF_SLOPE_PCT) * 100);
  const { subscore: subReports, recentCount, categories } = reportsSubscore(reports, now);

  const round1 = (n: number) => Math.round(n * 10) / 10;

  // 2) Detalhamento por fator.
  const factors: FactorBreakdown[] = [
    {
      key: "rain_72h",
      label: "Chuva acumulada (72h)",
      value: accumulatedRain72h,
      subscore: round1(subRain72),
      weight: WEIGHTS.rain_72h,
      contribution: round1(subRain72 * WEIGHTS.rain_72h),
    },
    {
      key: "forecast_7d",
      label: "Previsão de chuva (7 dias)",
      value: forecastRain7d,
      subscore: round1(subForecast),
      weight: WEIGHTS.forecast_7d,
      contribution: round1(subForecast * WEIGHTS.forecast_7d),
    },
    {
      key: "slope",
      label: "Declividade",
      value: slope,
      subscore: round1(subSlope),
      weight: WEIGHTS.slope,
      contribution: round1(subSlope * WEIGHTS.slope),
    },
    {
      key: "reports",
      label: "Relatos da comunidade",
      value: recentCount,
      subscore: round1(subReports),
      weight: WEIGHTS.reports,
      contribution: round1(subReports * WEIGHTS.reports),
    },
  ];

  // 3) Score final.
  const score = round1(clamp(factors.reduce((acc, f) => acc + f.contribution, 0)));
  const level = scoreToLevel(score);

  // 4) Explicação e recomendações.
  const explanation = buildExplanation(level, factors, recentCount, categories);
  const recommendations = buildRecommendations(level, factors, recentCount);

  return { score, level, explanation, recommendations, factors };
}
