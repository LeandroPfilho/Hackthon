/* Verificação rápida do núcleo portado (Etapa 8). Rodar: npx tsx scripts/verify-core.ts */
import { getRepository } from "@/lib/repository";
import { classifyByRules } from "@/lib/services/ai-classifier";
import { calculateTrafficIndex } from "@/lib/services/scoring";
import { generateWeeklySummary } from "@/lib/services/reporting";
import { buildSummary } from "@/lib/services/dashboard";

let fails = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) fails++;
}

async function main() {
  // 1) Scoring: paridade com o Python (Ponte do Branco ~ 92, critico)
  const r = calculateTrafficIndex({
    accumulatedRain72h: 92,
    forecastRain7d: 140,
    slope: 8.5,
    reports: [
      { severity: "critica", category: "lama", created_at: new Date(Date.now() - 86400000).toISOString() },
      { severity: "alta", category: "buraco", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
    ],
  });
  check(`score ~92 (got ${r.score})`, r.score >= 88 && r.score <= 95);
  check(`nivel critico (got ${r.level})`, r.level === "critico");
  check("explicacao cita 72h", r.explanation.includes("72h"));
  check("tem recomendacoes", r.recommendations.length > 0);
  check("4 fatores", r.factors.length === 4);

  // 2) Classificacao por regras
  check("regras: lama", classifyByRules("muita lama escorregadia").categoria === "lama");
  check("regras: ponte critica", classifyByRules("ponte cedendo, grave").severidade === "critica");
  check("regras: outro", classifyByRules("texto sem palavra").categoria === "outro");

  // 3) Repositorio mock: 8 trechos, criar denuncia recalcula
  const repo = getRepository();
  const segs = await repo.listSegments();
  check(`8 trechos (got ${segs.length})`, segs.length === 8);

  const segId = "11111111-1111-1111-1111-000000000004"; // Laticinio (baixo)
  const before = (await repo.getSegment(segId))!.reports_count;
  await repo.createReport({
    road_segment_id: segId,
    description: "Atolamento grave",
    category: "atolamento",
    severity: "critica",
  });
  const after = await repo.getSegment(segId);
  check(`createReport recalcula (count ${before}->${after!.reports_count})`, after!.reports_count === before + 1);

  // 4) Dashboard + relatorio semanal
  const reports = await repo.listReports();
  const summary = buildSummary(await repo.listSegments(), reports);
  check(`summary total 8 (got ${summary.total_segments})`, summary.total_segments === 8);
  const weekly = await generateWeeklySummary(await repo.listSegments(), reports);
  check("weekly por regras", weekly.generated_by === "regras");
  check("weekly cita Ariquemes", weekly.summary.includes("Ariquemes"));

  console.log(`\n${fails === 0 ? "TODOS OS CHECKS PASSARAM" : fails + " FALHA(S)"}`);
  process.exit(fails === 0 ? 0 : 1);
}

main();
