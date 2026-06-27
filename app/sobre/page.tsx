import {
  Brain,
  Cloud,
  Database,
  Gauge,
  Layers,
  ShieldCheck,
} from "lucide-react";

import { LogoMark } from "@/components/brand";
import { Card, CardContent } from "@/components/ui/card";
import { dataMode } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sobre o Projeto — LinhaMap",
};

/** Página institucional / configurações (Seção 11 — 7ª tela). */
export default function SobrePage() {
  const mode = dataMode();

  return (
    <div className="container max-w-4xl py-12">
      <div className="mb-10 flex flex-col gap-3">
        <LogoMark height={56} />
        <h1 className="text-3xl font-bold tracking-tight">Sobre o LinhaMap</h1>
        <p className="text-muted-foreground">
          Plataforma preditiva de trafegabilidade rural para Ariquemes/RO, desenvolvida para
          a Hackathon Extensionista IFRO Ariquemes 2026/1 (Desafio Empresa e Comunidade).
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <Section icon={<Gauge />} title="Como funciona o Índice de Trafegabilidade">
          <p>
            Cada trecho recebe um score de <strong>0 a 100</strong>, calculado por uma fórmula
            ponderada e <strong>explicável</strong> (não é caixa-preta):
          </p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            <li>• Chuva acumulada nas últimas 72h — peso 30%</li>
            <li>• Previsão de chuva para 7 dias — peso 25%</li>
            <li>• Declividade do trecho — peso 15%</li>
            <li>• Relatos da comunidade (gravidade × recência) — peso 30%</li>
          </ul>
          <p className="mt-2">
            O score vira um nível textual: <strong>0–24 baixo</strong>, <strong>25–49 médio</strong>,{" "}
            <strong>50–74 alto</strong>, <strong>75–100 crítico</strong>. O sistema sempre
            explica por que um trecho recebeu determinado risco.
          </p>
        </Section>

        <Section icon={<Brain />} title="Como funciona a Inteligência Artificial">
          <p>
            As denúncias enviadas pela comunidade são classificadas automaticamente em
            categoria (buraco, lama, erosão, ponte danificada, atolamento) e severidade. Quando
            há chave de API configurada, usamos o <strong>Claude (multimodal)</strong> para
            analisar foto e descrição; caso contrário, um <strong>fallback por regras</strong>{" "}
            garante o funcionamento. O relatório semanal também pode ser redigido por IA.
          </p>
        </Section>

        <Section icon={<Cloud />} title="Fontes de dados">
          <p>
            Preparado para integrar <strong>Open-Meteo</strong> (precipitação),{" "}
            <strong>OpenStreetMap</strong> (vias), <strong>SRTM</strong> (declividade) e{" "}
            <strong>INMET</strong> (clima). No MVP, os dados de Ariquemes são mockados para
            funcionar imediatamente.
          </p>
        </Section>

        <Section icon={<Layers />} title="Stack técnica">
          <p>
            Aplicação <strong>100% Next.js</strong> (App Router) + TypeScript, com a API em
            Route Handlers, TailwindCSS, shadcn/ui e Leaflet. Banco em Supabase (PostgreSQL +
            PostGIS). Deploy único na Vercel, com reprocessamento diário automático via cron.
          </p>
        </Section>

        <Section icon={<ShieldCheck />} title="Uso responsável de IA">
          <p>
            As ferramentas de IA utilizadas e suas finalidades estão declaradas no arquivo{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">docs/DECLARACAO_IA.md</code>{" "}
            do repositório, conforme exigência do edital. A equipe compreende, testa e defende
            tecnicamente toda a solução.
          </p>
        </Section>

        <Section icon={<Database />} title="Configurações">
          <p>
            Modo de dados atual:{" "}
            <strong>{mode === "mock" ? "Demonstração (mock)" : "Supabase (produção)"}</strong>.
            No modo demonstração, a aplicação funciona sem banco externo nem chaves de IA — ideal
            para avaliação imediata.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex gap-4 p-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}
