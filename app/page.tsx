import Link from "next/link";
import {
  Building2,
  CloudRain,
  Gauge,
  MapPin,
  Megaphone,
  Mountain,
  Route,
  ShieldCheck,
  Sprout,
  Truck,
  Users,
} from "lucide-react";

import { LogoMark } from "@/components/brand";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { RiskBadge } from "@/components/risk-badge";
import { WhatsappCta } from "@/components/whatsapp-cta";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getRepository } from "@/lib/repository";
import { buildSummary } from "@/lib/services/dashboard";
import { RISK_LEVELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const repo = getRepository();
  const [segments, reports] = await Promise.all([repo.listSegments(), repo.listReports()]);
  const summary = buildSummary(segments, reports);

  return (
    <div className="flex flex-col">
      {/* ---------------- HERO ---------------- */}
      <section className="border-b bg-gradient-to-b from-secondary/40 to-background">
        <div className="container flex flex-col items-center gap-6 py-20 text-center">
          <LogoMark height={76} priority />
          <span className="rounded-full border bg-background px-4 py-1.5 text-sm font-medium text-muted-foreground">
            Hackathon IFRO Ariquemes 2026/1 · Desafio Empresa e Comunidade
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Antecipe o bloqueio das estradas vicinais de{" "}
            <span className="text-primary">Ariquemes</span>
          </h1>
          <p className="max-w-2xl text-balance text-lg text-muted-foreground">
            O LinhaMap cruza previsão de chuva, declividade e relatos da comunidade para
            prever, com até 7 dias de antecedência, quais trechos rurais têm maior risco de
            ficarem intransitáveis — trocando a manutenção reativa pela preventiva.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/mapa">
                <MapPin /> Ver mapa de risco
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/denuncia">
                <Megaphone /> Registrar denúncia
              </Link>
            </Button>
            <WhatsappCta label="Denunciar pelo Zap" size="lg" />
            <InstallPwaButton size="lg" />
          </div>

          {/* Stats ao vivo */}
          <div className="mt-6 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Trechos monitorados" value={summary.total_segments} />
            <Stat label="Trechos críticos" value={summary.critical_segments} accent="critico" />
            <Stat label="Ocorrências abertas" value={summary.open_reports} />
            <Stat label="Índice médio" value={summary.average_index} />
          </div>
        </div>
      </section>

      {/* ---------------- PROBLEMA ---------------- */}
      <section className="container py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-bold tracking-tight">O problema</h2>
            <p className="text-muted-foreground">
              No período chuvoso, as linhas rurais de Ariquemes ficam intransitáveis e
              comprometem o transporte de leite, peixe, gado, café e hortaliças. Hoje a
              manutenção é <strong className="text-foreground">reativa</strong>: só acontece
              depois que caminhões atolam ou produtores já tiveram prejuízo.
            </p>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              {[
                "Perdas de produção perecível",
                "Aumento do custo logístico",
                "Isolamento de propriedades",
                "Falta de dados para decisões de manutenção",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <Card>
            <CardContent className="flex flex-col gap-3 p-6">
              <span className="text-sm font-medium text-muted-foreground">
                Índice de Trafegabilidade (0–100)
              </span>
              <div className="flex flex-wrap gap-2">
                {RISK_LEVELS.map((level) => (
                  <RiskBadge key={level} level={level} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Cada trecho recebe um score explicável e um nível de risco, recalculado
                diariamente conforme a chuva e os relatos.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ---------------- COMO FUNCIONA ---------------- */}
      <section className="border-y bg-muted/30 py-16">
        <div className="container flex flex-col gap-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Como funciona</h2>
            <p className="max-w-2xl text-muted-foreground">
              Um índice transparente, não uma caixa-preta: o sistema sempre explica por que
              um trecho recebeu determinado risco.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Step icon={<CloudRain />} title="1. Coleta de dados" text="Previsão de chuva (7 dias), chuva acumulada (72h), declividade e histórico." />
            <Step icon={<Gauge />} title="2. Índice explicável" text="Fórmula ponderada gera um score de 0 a 100 com justificativa textual." />
            <Step icon={<Route />} title="3. Mapa de risco" text="Trechos coloridos por nível, com recomendações de ação prioritárias." />
            <Step icon={<Megaphone />} title="4. Denúncia colaborativa" text="Produtores relatam ocorrências; a IA classifica e o score se atualiza." />
          </div>
        </div>
      </section>

      {/* ---------------- PARA QUEM É ---------------- */}
      <section className="container py-16">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Para quem é</h2>
          <p className="max-w-2xl text-muted-foreground">
            Da porteira à gestão pública, decisões baseadas em dados.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Audience icon={<Sprout />} title="Produtores rurais" text="Piscicultores, pecuaristas e produtores de leite e café." />
          <Audience icon={<Truck />} title="Transportadoras" text="Planejamento de rotas e cargas evitando trechos críticos." />
          <Audience icon={<Users />} title="Cooperativas" text="Coordenação do escoamento da produção da região." />
          <Audience icon={<Building2 />} title="Secretaria de Obras" text="Priorização da manutenção preventiva com base em dados." />
        </div>
      </section>

      {/* ---------------- BENEFÍCIOS ---------------- */}
      <section className="border-t bg-muted/30 py-16">
        <div className="container grid gap-6 md:grid-cols-2">
          <Benefit
            icon={<Sprout />}
            title="Para o produtor"
            items={[
              "Planejar a colheita e o transporte com antecedência",
              "Reduzir perdas de produção perecível",
              "Relatar problemas direto do celular, com foto",
            ]}
          />
          <Benefit
            icon={<ShieldCheck />}
            title="Para a Secretaria de Obras"
            items={[
              "Visualizar rapidamente quais trechos priorizar",
              "Relatório semanal pronto para ata e ofício",
              "Histórico de ocorrências e exportação em CSV",
            ]}
          />
        </div>
      </section>

      {/* ---------------- CTA FINAL ---------------- */}
      <section className="container py-20">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
            <Mountain className="h-10 w-10" />
            <h2 className="max-w-2xl text-balance text-3xl font-bold">
              Comece a prevenir bloqueios nas linhas de Ariquemes
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link href="/mapa">Explorar o mapa</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link href="/dashboard">Painel da Secretaria</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ---------------- Componentes locais ----------------

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "critico";
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1 p-4">
        <span
          className={
            accent === "critico"
              ? "text-3xl font-bold text-[hsl(var(--risk-critico))]"
              : "text-3xl font-bold text-primary"
          }
        >
          {value}
        </span>
        <span className="text-center text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

function Step({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

function Audience({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary [&_svg]:h-6 [&_svg]:w-6">
          {icon}
        </span>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

function Benefit({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:h-5 [&_svg]:w-5">
            {icon}
          </span>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
