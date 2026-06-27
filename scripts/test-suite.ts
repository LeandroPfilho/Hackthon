/**
 * Suíte de testes do LinhaMap — disciplina Teste de Software (Hackathon IFRO 2026/1).
 *
 * Organizada pelas 3 funcionalidades críticas do MVP. Cada caso é marcado como
 * [feliz] (caminho feliz) ou [borda] (erro / valor-limite), seguindo a Análise
 * de Valor-Limite e Particionamento de Equivalência (BSTQB 2023, Cap. 6).
 *
 * Rodar:  npm test        (gera o relatório PASS/FAIL — evidência de validação)
 */
import { calculateTrafficIndex } from "@/lib/services/scoring";
import { classifyByRules } from "@/lib/services/ai-classifier";
import { parseOpenMeteoDaily } from "@/lib/services/weather";
import { serializeSegmentDetail } from "@/lib/services/serializers";
import { heatPoints, severityIntensity } from "@/lib/services/dashboard";
import { getRepository } from "@/lib/repository";
import { scoreToLevel, type Report, type Segment } from "@/lib/types";

// --- Mini-harness (sem dependências externas; roda via tsx) ---
type Kind = "feliz" | "borda";
interface Case {
  kind: Kind;
  name: string;
  run: () => boolean | Promise<boolean>;
}
interface Group {
  funcionalidade: string;
  oraculo: string;
  cases: Case[];
}

const HORA = 3_600_000;
const agora = Date.now();

const groups: Group[] = [
  // =========================================================================
  {
    funcionalidade: "F1 — Índice de Trafegabilidade (motor de score)",
    oraculo:
      "Score determinístico 0–100 pela fórmula ponderada; nível por faixas " +
      "0–24 baixo · 25–49 médio · 50–74 alto · 75–100 crítico.",
    cases: [
      {
        kind: "feliz",
        name: "Trecho Ponte do Branco (92mm/140mm/8,5%/2 relatos) → score ~92, crítico",
        run: () => {
          const r = calculateTrafficIndex({
            accumulatedRain72h: 92,
            forecastRain7d: 140,
            slope: 8.5,
            reports: [
              { severity: "critica", category: "lama", created_at: new Date(agora - 24 * HORA).toISOString() },
              { severity: "alta", category: "buraco", created_at: new Date(agora - 48 * HORA).toISOString() },
            ],
          });
          return r.score >= 88 && r.score <= 95 && r.level === "critico";
        },
      },
      {
        kind: "feliz",
        name: "Score explicável: cita os 72h, lista 4 fatores e gera recomendações",
        run: () => {
          const r = calculateTrafficIndex({ accumulatedRain72h: 92, forecastRain7d: 140, slope: 8.5 });
          return r.explanation.includes("72h") && r.factors.length === 4 && r.recommendations.length > 0;
        },
      },
      // --- Valor-limite das faixas (o caso de borda mais importante) ---
      {
        kind: "borda",
        name: "Valor-limite scoreToLevel: 24,9→baixo · 25→médio (fronteira baixo/médio)",
        run: () => scoreToLevel(24.9) === "baixo" && scoreToLevel(25) === "medio",
      },
      {
        kind: "borda",
        name: "Valor-limite scoreToLevel: 49,9→médio · 50→alto (fronteira médio/alto)",
        run: () => scoreToLevel(49.9) === "medio" && scoreToLevel(50) === "alto",
      },
      {
        kind: "borda",
        name: "Valor-limite scoreToLevel: 74,9→alto · 75→crítico (fronteira alto/crítico)",
        run: () => scoreToLevel(74.9) === "alto" && scoreToLevel(75) === "critico",
      },
      {
        kind: "borda",
        name: "Limite de chuva: com demais fatores nulos, vira Baixo→Médio entre 83mm e 84mm",
        run: () => {
          const baixo = calculateTrafficIndex({ accumulatedRain72h: 83 });
          const medio = calculateTrafficIndex({ accumulatedRain72h: 84 });
          return baixo.level === "baixo" && medio.level === "medio";
        },
      },
      {
        kind: "borda",
        name: "Entrada vazia → score 0, nível baixo, explicação de trecho estável",
        run: () => {
          const r = calculateTrafficIndex({});
          return r.score === 0 && r.level === "baixo" && /est[aá]vel|normal/i.test(r.explanation);
        },
      },
      {
        kind: "borda",
        name: "Entrada inválida (chuva negativa) é saneada (clamp) → não explode, score em [0,100]",
        run: () => {
          const r = calculateTrafficIndex({ accumulatedRain72h: -50, forecastRain7d: 999, slope: -3 });
          return r.score >= 0 && r.score <= 100 && Number.isFinite(r.score);
        },
      },
    ],
  },
  // =========================================================================
  {
    funcionalidade: "F2 — Classificação automática da denúncia (IA + fallback por regras)",
    oraculo:
      "Sempre retorna { categoria, severidade } válidos; sem chave de IA, " +
      "usa o fallback por palavras-chave — nunca quebra o cadastro.",
    cases: [
      {
        kind: "feliz",
        name: '"muita lama escorregadia" → categoria lama',
        run: () => classifyByRules("muita lama escorregadia").categoria === "lama",
      },
      {
        kind: "feliz",
        name: '"ponte cedendo, grave" → categoria ponte_danificada e severidade crítica',
        run: () => {
          const c = classifyByRules("ponte cedendo, grave");
          return c.categoria === "ponte_danificada" && c.severidade === "critica";
        },
      },
      {
        kind: "borda",
        name: 'Texto sem palavra-chave → categoria "outro" (degrada com segurança)',
        run: () => classifyByRules("texto qualquer aleatório").categoria === "outro",
      },
      {
        kind: "borda",
        name: "Descrição vazia/nula não quebra → retorna contrato válido",
        run: () => classifyByRules("").categoria === "outro" && classifyByRules(null).categoria === "outro",
      },
    ],
  },
  // =========================================================================
  {
    funcionalidade: "F3 — Recalcular risco ao registrar denúncia (repositório)",
    oraculo:
      "Criar uma denúncia incrementa a contagem do trecho e recalcula o " +
      "Índice; uma denúncia grave e recente pode elevar o nível de risco.",
    cases: [
      {
        kind: "feliz",
        name: "createReport incrementa reports_count do trecho",
        run: async () => {
          const repo = getRepository();
          const id = "11111111-1111-1111-1111-000000000004"; // Laticínio (baixo)
          const before = (await repo.getSegment(id))!.reports_count;
          await repo.createReport({
            road_segment_id: id,
            description: "Atolamento grave",
            category: "atolamento",
            severity: "critica",
          });
          const after = (await repo.getSegment(id))!.reports_count;
          return after === before + 1;
        },
      },
      {
        kind: "borda",
        name: "Denúncia crítica e recente eleva o nível de um trecho que era baixo",
        run: async () => {
          const repo = getRepository();
          const id = "11111111-1111-1111-1111-000000000008"; // Curva da Serra (baixo, sem relatos)
          const before = (await repo.getSegment(id))!;
          await repo.createReport({
            road_segment_id: id,
            description: "Ponte cedendo, intransitável",
            category: "ponte_danificada",
            severity: "critica",
          });
          const after = (await repo.getSegment(id))!;
          return after.risk_score > before.risk_score;
        },
      },
      {
        kind: "borda",
        name: "Repositório mock carrega exatamente os 8 trechos de Ariquemes",
        run: async () => (await getRepository().listSegments()).length === 8,
      },
    ],
  },
  // =========================================================================
  {
    funcionalidade: "F4 — Integração meteorológica real (Open-Meteo)",
    oraculo:
      "Converte o bloco `daily` da API em acumulado 72h (3 dias passados) + " +
      "previsão de 7 dias; falha/resposta vazia degrada para os dados atuais.",
    cases: [
      {
        kind: "feliz",
        name: "3 dias passados + 7 de previsão → acumulado 60mm, previsão 21mm, 7 dias (data DD/MM)",
        run: () => {
          const w = parseOpenMeteoDaily({
            time: [
              "2026-06-09", "2026-06-10", "2026-06-11", // passado (72h)
              "2026-06-12", "2026-06-13", "2026-06-14", "2026-06-15",
              "2026-06-16", "2026-06-17", "2026-06-18", // previsão (7d)
            ],
            precipitation_sum: [10, 20, 30, 5, 4, 3, 2, 1, 0, 6],
          });
          return (
            w.accumulated_rain_72h === 60 &&
            w.forecast_rain_7d === 21 &&
            w.forecast_daily.length === 7 &&
            w.forecast_daily[0].date === "12/06"
          );
        },
      },
      {
        kind: "borda",
        name: "Sem dias passados (só 7 de previsão) → acumulado null, não sobrescreve",
        run: () => {
          const w = parseOpenMeteoDaily({
            time: ["2026-06-12", "2026-06-13", "2026-06-14", "2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18"],
            precipitation_sum: [5, 4, 3, 2, 1, 0, 6],
          });
          return w.accumulated_rain_72h === null && w.forecast_rain_7d === 21 && w.forecast_daily.length === 7;
        },
      },
      {
        kind: "borda",
        name: "Resposta vazia/indefinida não quebra → acumulado null, previsão 0, lista vazia",
        run: () => {
          const w = parseOpenMeteoDaily(undefined);
          return w.accumulated_rain_72h === null && w.forecast_rain_7d === 0 && w.forecast_daily.length === 0;
        },
      },
    ],
  },
  // =========================================================================
  {
    funcionalidade: "F5 — Modo demonstração (congela níveis curados)",
    oraculo:
      "Com demoMode, o painel mostra o nível/score ARMAZENADO; sem demoMode, " +
      "recalcula ao vivo a partir das entradas (que decaem com o tempo).",
    cases: [
      {
        kind: "feliz",
        name: "demoMode=true → painel devolve o valor curado armazenado (crítico/86), não o recalculado",
        run: () => {
          const curado = {
            id: "test", name: "T", rural_line: "T",
            coordinates: [[-63, -9], [-63.01, -9.01]],
            latitude: -9, longitude: -63, slope: 1,
            accumulated_rain_72h: 10, forecast_rain_7d: 10, forecast_daily: [],
            reports_count: 0, risk_score: 86, risk_level: "critico",
            explanation: "Curado: risco crítico.", updated_at: null,
          } as unknown as Segment;
          const d = serializeSegmentDetail(curado, [], { demoMode: true });
          return d.risk_level === "critico" && d.risk_score === 86;
        },
      },
      {
        kind: "borda",
        name: "demoMode=false → mesmo trecho recalcula ao vivo e cai (baixo), provando o problema que o modo demo blinda",
        run: () => {
          const curado = {
            id: "test", name: "T", rural_line: "T",
            coordinates: [[-63, -9], [-63.01, -9.01]],
            latitude: -9, longitude: -63, slope: 1,
            accumulated_rain_72h: 10, forecast_rain_7d: 10, forecast_daily: [],
            reports_count: 0, risk_score: 86, risk_level: "critico",
            explanation: "Curado: risco crítico.", updated_at: null,
          } as unknown as Segment;
          const d = serializeSegmentDetail(curado, [], { demoMode: false });
          return d.risk_level === "baixo" && d.risk_score < 86;
        },
      },
    ],
  },
  // =========================================================================
  {
    funcionalidade: "F6 — Mapa de calor do dashboard (heatPoints)",
    oraculo:
      "Cada denúncia georreferenciada vira um ponto [lat, lon, intensidade]; " +
      "a intensidade reflete a severidade e denúncias sem GPS são ignoradas.",
    cases: [
      {
        kind: "feliz",
        name: "Intensidade por severidade: crítica=1 · alta=0,7 · média=0,4 · baixa=0,2",
        run: () =>
          severityIntensity("critica") === 1 &&
          severityIntensity("alta") === 0.7 &&
          severityIntensity("media") === 0.4 &&
          severityIntensity("baixa") === 0.2,
      },
      {
        kind: "feliz",
        name: "heatPoints mapeia denúncia georreferenciada → [lat, lon, intensidade]",
        run: () => {
          const reports = [
            { latitude: -9.89, longitude: -63.15, severity: "critica" },
          ] as unknown as Report[];
          const pts = heatPoints(reports);
          return (
            pts.length === 1 &&
            pts[0][0] === -9.89 &&
            pts[0][1] === -63.15 &&
            pts[0][2] === 1
          );
        },
      },
      {
        kind: "borda",
        name: "heatPoints ignora denúncias sem latitude/longitude (não quebra o mapa)",
        run: () => {
          const reports = [
            { latitude: -9.89, longitude: -63.15, severity: "alta" },
            { latitude: null, longitude: null, severity: "critica" },
            { latitude: -9.9, longitude: undefined, severity: "media" },
          ] as unknown as Report[];
          const pts = heatPoints(reports);
          return pts.length === 1 && pts[0][2] === 0.7;
        },
      },
      {
        kind: "borda",
        name: "Severidade desconhecida/ausente → intensidade mínima 0,2 (degrada com segurança)",
        run: () =>
          severityIntensity(undefined) === 0.2 &&
          severityIntensity(null) === 0.2 &&
          severityIntensity("xyz") === 0.2,
      },
    ],
  },
];

// --- Execução + relatório ---
async function main() {
  let pass = 0;
  let fail = 0;
  console.log("LinhaMap — Suíte de Testes (Teste de Software / BSTQB 4.0, Cap. 6)\n");

  for (const g of groups) {
    console.log(`\n■ ${g.funcionalidade}`);
    console.log(`  Oráculo: ${g.oraculo}`);
    for (const c of g.cases) {
      let ok = false;
      try {
        ok = await c.run();
      } catch (err) {
        ok = false;
        console.log(`    erro: ${(err as Error).message}`);
      }
      if (ok) pass++;
      else fail++;
      const tag = c.kind === "feliz" ? "[feliz]" : "[borda]";
      console.log(`    ${ok ? "PASS" : "FALHOU"}  ${tag} ${c.name}`);
    }
  }

  const total = pass + fail;
  console.log(`\n${"─".repeat(60)}`);
  console.log(`Resultado: ${pass}/${total} casos passaram${fail ? ` — ${fail} FALHA(S)` : " — TODOS OK"}`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
