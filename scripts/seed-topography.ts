/**
 * scripts/seed-topography.ts
 * ---------------------------------------------------------------------------
 * Carga PRÉ-PROCESSADA (batch) da declividade (`slope`, em %) dos trechos
 * rurais em `road_segments`. Roda na máquina do dev / num job — NUNCA no
 * frontend — para o MVP não depender de API externa na hora da apresentação.
 *
 * Fluxo:
 *   1. Conecta no Supabase com a service-role (bypassa RLS).
 *   2. SELECT em road_segments (id, nome, traçado e ponto representativo).
 *   3. Coleta os vértices do trecho:
 *        - PREFERE TODOS os vértices de `coordinates` (LineString real), para
 *          captar ondulações no meio do trecho — não só os extremos.
 *        - FALLBACK: ponto representativo (A) + um B deslocado ~1km (offset),
 *          usado só quando o trecho não tem geometria.
 *   4. Busca a elevação (m) de todos os vértices numa ÚNICA chamada (Open-Meteo).
 *   5. Calcula a declividade de cada par consecutivo e guarda a MAIOR (o trecho
 *      mais íngreme é o que dirige o risco; o scoring satura em ~10%). Loga
 *      também a média ponderada por distância, para contexto.
 *   6. UPDATE de `slope` no trecho.
 *   7. Delay entre trechos (rate-limit defensivo contra HTTP 429).
 *
 * NOTA DE ARQUITETURA (Tech Lead):
 *   O enunciado pedia o endpoint `api.opentopography.org/api/dem?lat=&lon=`,
 *   mas essa é a API de RASTER do OpenTopography (precisa de API key + bbox e
 *   devolve GeoTIFF, não um número). Para elevação POR PONTO uso o Open-Meteo
 *   Elevation API (grátis, sem key, batch, já confiável no projeto). Quem quiser
 *   SRTM "puro" troca ELEVATION_PROVIDER para "opentopodata" (api.opentopodata.org).
 *
 * Execução:
 *   npx tsx --env-file=.env.local scripts/seed-topography.ts
 *   (Node 20.6+ entende --env-file; se faltar o tsx: `npm i -D tsx`.)
 * ---------------------------------------------------------------------------
 */
import { createClient } from "@supabase/supabase-js";

// ── Configuração ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Pausa entre trechos (ms) — protege contra rate-limit (429). */
const DELAY_MS = 1500;
/** Distância do B fictício quando o trecho não tem geometria (km). */
const FALLBACK_OFFSET_KM = 1;
/** Rumo (graus) do offset de fallback — fixo, só p/ ter 2 pontos distintos. */
const FALLBACK_BEARING_DEG = 90;
/** "open-meteo" (padrão, sem key) | "opentopodata" (SRTM puro, 1 req/s público). */
const ELEVATION_PROVIDER: "open-meteo" | "opentopodata" = "open-meteo";
/** --dry-run: calcula e loga tudo, mas NÃO grava no banco. */
const DRY_RUN = process.argv.includes("--dry-run");

type LatLon = { lat: number; lon: number };

interface SegmentRow {
  id: string;
  name: string | null;
  rural_line: string | null;
  latitude: number;
  longitude: number;
  /** Traçado [[lon, lat], ...] (WGS84). Pode vir null. */
  coordinates: [number, number][] | null;
}

// ── Utilidades geográficas (puras, testáveis) ─────────────────────────────

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;
const EARTH_RADIUS_M = 6_371_000;

/** Distância de Haversine entre dois pontos, em METROS. */
function calculateHaversineDistance(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Ponto de destino dado origem, rumo (graus) e distância (km). */
function destinationPoint(origin: LatLon, distanceKm: number, bearingDeg: number): LatLon {
  const δ = (distanceKm * 1000) / EARTH_RADIUS_M;
  const θ = toRad(bearingDeg);
  const φ1 = toRad(origin.lat);
  const λ1 = toRad(origin.lon);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    );
  return { lat: toDeg(φ2), lon: toDeg(λ2) };
}

/**
 * Resolve os vértices do trecho usados para a declividade.
 * Prefere a geometria real (TODOS os vértices do LineString, p/ captar ondulações
 * intermediárias); cai em 2 pontos (A + offset fictício) só quando não há traçado.
 */
function resolveVertices(seg: SegmentRow): { points: LatLon[]; source: "geometria" | "offset" } {
  const coords = seg.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const points = coords.map(([lon, lat]) => ({ lat, lon }));
    const total = points
      .slice(1)
      .reduce((acc, p, i) => acc + calculateHaversineDistance(points[i], p), 0);
    if (total >= 1) return { points, source: "geometria" };
  }
  const a = { lat: seg.latitude, lon: seg.longitude };
  const b = destinationPoint(a, FALLBACK_OFFSET_KM, FALLBACK_BEARING_DEG);
  return { points: [a, b], source: "offset" };
}

// ── Elevação (rede) ───────────────────────────────────────────────────────

/**
 * Busca a elevação (m) de VÁRIOS pontos numa única requisição.
 * Padrão: Open-Meteo Elevation API (grátis, sem key, batch).
 * Alternativa SRTM: OpenTopoData (api.opentopodata.org/v1/srtm30m).
 * Lança Error em falha de rede/resposta inválida (tratado por trecho acima).
 */
async function getElevationFromOpenTopography(points: LatLon[]): Promise<number[]> {
  if (points.length === 0) return [];

  let url: URL;
  if (ELEVATION_PROVIDER === "opentopodata") {
    // SRTM 30m por ponto — público: 1 req/s, máx. 100 pontos/chamada.
    url = new URL("https://api.opentopodata.org/v1/srtm30m");
    url.searchParams.set("locations", points.map((p) => `${p.lat},${p.lon}`).join("|"));
  } else {
    // Open-Meteo Elevation — latitude/longitude em listas paralelas.
    url = new URL("https://api.open-meteo.com/v1/elevation");
    url.searchParams.set("latitude", points.map((p) => p.lat).join(","));
    url.searchParams.set("longitude", points.map((p) => p.lon).join(","));
  }

  const resp = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!resp.ok) throw new Error(`Elevation API HTTP ${resp.status}`);
  const json = (await resp.json()) as {
    elevation?: (number | null)[]; // open-meteo
    results?: { elevation: number | null }[]; // opentopodata
  };

  const raw =
    ELEVATION_PROVIDER === "opentopodata"
      ? (json.results ?? []).map((r) => r.elevation)
      : json.elevation ?? [];

  if (raw.length !== points.length || raw.some((e) => e == null)) {
    throw new Error(`Elevação ausente/inesperada (esperado ${points.length}, veio ${raw.length})`);
  }
  return raw.map((e) => Number(e));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clampSlope = (v: number) => Math.max(0, Math.min(100, Math.round(v * 100) / 100));

// ── Orquestração ──────────────────────────────────────────────────────────

async function processSegments(): Promise<void> {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  console.log("🗺️  LinhaMap — carga de topografia (declividade)\n");

  const { data, error } = await supabase
    .from("road_segments")
    .select("id, name, rural_line, latitude, longitude, coordinates")
    .order("rural_line", { ascending: true });

  if (error) throw new Error(`Falha no SELECT de road_segments: ${error.message}`);
  const segments = (data ?? []) as SegmentRow[];

  if (segments.length === 0) {
    console.log("⚠️  Nenhum trecho encontrado em road_segments. Nada a fazer.");
    return;
  }

  console.log(
    `🔎 ${segments.length} trecho(s) encontrados. Provider de elevação: ${ELEVATION_PROVIDER}` +
      `${DRY_RUN ? "  · 🧪 DRY-RUN (não grava)" : ""}\n`,
  );

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const label = seg.rural_line ?? seg.name ?? seg.id.slice(0, 8);
    const progress = `[${i + 1}/${segments.length}]`;

    try {
      const { points, source } = resolveVertices(seg);
      const elevs = await getElevationFromOpenTopography(points);

      // Declividade de cada par consecutivo de vértices. Guarda a MAIOR (trecho
      // mais íngreme — dirige o risco) e a média ponderada por distância
      // (= Σ|Δelev| / Σdist), que NÃO se cancela em sobe-desce como faziam só os
      // extremos.
      let maxSlope = 0;
      let riseSum = 0;
      let distSum = 0;
      for (let k = 0; k < points.length - 1; k++) {
        const d = calculateHaversineDistance(points[k], points[k + 1]);
        if (d < 1) continue;
        const s = (Math.abs(elevs[k + 1] - elevs[k]) / d) * 100;
        if (s > maxSlope) maxSlope = s;
        riseSum += Math.abs(elevs[k + 1] - elevs[k]);
        distSum += d;
      }

      if (distSum < 1) {
        console.log(`⏭️  ${progress} ${label}: vértices coincidentes (sem distância). Pulando.`);
        failed++;
        continue;
      }

      const slope = clampSlope(maxSlope);
      const avgSlope = clampSlope((riseSum / distSum) * 100);

      if (!DRY_RUN) {
        const { error: upErr } = await supabase
          .from("road_segments")
          .update({ slope })
          .eq("id", seg.id);
        if (upErr) throw new Error(`UPDATE falhou: ${upErr.message}`);
      }

      console.log(
        `📍 ${progress} ${label}: ${points.length} vértices · ` +
          `máx=${slope}% · média=${avgSlope}% · ${distSum.toFixed(0)}m (${source})${DRY_RUN ? " 🧪" : " ✅"}`,
      );
      ok++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ ${progress} ${label}: ${msg}`);
      failed++;
    }

    // Rate-limit defensivo — não dorme após o último trecho.
    if (i < segments.length - 1) await sleep(DELAY_MS);
  }

  console.log(
    `\n🏁 Concluído: ${ok} ${DRY_RUN ? "calculado(s) (nada gravado)" : "atualizado(s)"}, ` +
      `${failed} com falha/pulado(s).`,
  );
}

// ── Entry point ───────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "❌ Variáveis de ambiente ausentes.\n" +
        "   Defina SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY.\n" +
        "   Ex.: npx tsx --env-file=.env.local scripts/seed-topography.ts",
    );
    process.exit(1);
  }
  try {
    await processSegments();
    process.exit(0);
  } catch (err) {
    console.error(`\n💥 Erro fatal: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

void main();
