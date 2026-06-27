import Link from "next/link";
import { AlertTriangle, FileText, LogIn, MapPin, Megaphone, Plus } from "lucide-react";

import { FollowButton } from "@/components/map/follow-button";
import { RefreshOnShow } from "@/components/refresh-on-show";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS, PASSABILITY_VERDICT, STATUS_LABELS, STATUS_NEXT } from "@/lib/labels";
import { getRepository } from "@/lib/repository";
import { RISK_COLORS } from "@/lib/risk";
import { authConfigured, getSessionProfile } from "@/lib/supabase/auth-server";
import type { ReportStatus, RiskLevel } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Resumo — LinhaMap" };

// Pior primeiro: o produtor vê primeiro onde NÃO dá pra passar.
const SEVERITY_RANK: Record<RiskLevel, number> = { critico: 0, alto: 1, medio: 2, baixo: 3 };

// Cores do selo de status da denúncia.
const STATUS_BADGE: Record<ReportStatus, string> = {
  aberta: "bg-secondary text-secondary-foreground",
  em_analise: "bg-amber-100 text-amber-900",
  resolvida: "bg-primary/10 text-primary",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(iso));
}

export default async function ResumoPage() {
  const repo = getRepository();
  const segments = await repo.listSegments();

  const profile = authConfigured() ? await getSessionProfile() : null;
  const reports = profile ? await repo.listReports({ user_id: profile.user.id }) : [];

  const ordered = [...segments].sort(
    (a, b) => SEVERITY_RANK[a.risk_level] - SEVERITY_RANK[b.risk_level],
  );

  return (
    <div className="container max-w-2xl py-8">
      {/* Mantém a lista de denúncias fresca ao voltar/reabrir a aba. */}
      <RefreshOnShow />

      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Resumo</h1>
        <p className="mt-1 text-muted-foreground">
          Como estão as estradas e o que você já avisou — em poucas palavras.
        </p>
      </header>

      {/* Bloco 1 — Situação das estradas */}
      <section className="mb-8">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <MapPin className="h-5 w-5" /> Situação das estradas
        </h2>
        <p className="text-sm text-muted-foreground">
          🟢 boa · 🟡 com atenção · 🟠 difícil · 🔴 risco de ficar preso
        </p>
        <p className="mb-3 text-sm text-muted-foreground">
          🔔 Toque em <strong>“Receber alertas”</strong> na sua linha para ser avisado quando o
          risco aumentar.
        </p>
        <ul className="flex flex-col gap-3">
          {ordered.map((seg) => {
            const v = PASSABILITY_VERDICT[seg.risk_level];
            return (
              <li key={seg.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl leading-none" aria-hidden>
                        {v.emoji}
                      </span>
                      <div className="flex flex-1 flex-col gap-0.5">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span
                            className="text-base font-bold"
                            style={{ color: RISK_COLORS[seg.risk_level] }}
                          >
                            {v.titulo}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            — {seg.rural_line} · {seg.name}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{seg.explanation ?? v.sub}</p>
                      </div>
                    </div>
                    <FollowButton segmentId={seg.id} />
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Bloco 2 — Minhas denúncias (acompanhamento) */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5" /> Minhas denúncias
        </h2>

        {!profile ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <Megaphone className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Entre na sua conta para acompanhar suas denúncias e saber quando forem resolvidas.
              </p>
              <Button asChild size="sm">
                <Link href="/login?next=/resumo">
                  <LogIn className="mr-1.5 h-4 w-4" /> Entrar
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Você ainda não avisou nenhum problema. Quando avisar, ele aparece aqui com o andamento.
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {reports.map((r) => (
              <li key={r.id}>
                <Card>
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{CATEGORY_LABELS[r.category]}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[r.status]}`}
                      >
                        {STATUS_LABELS[r.status]}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatDate(r.created_at)}
                      </span>
                    </div>
                    {r.description && <p className="text-sm">{r.description}</p>}
                    <p className="text-sm text-muted-foreground">{STATUS_NEXT[r.status]}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Bloco 3 — CTA */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-primary" />
          <p className="font-medium">Viu um problema numa estrada?</p>
          <p className="text-sm text-muted-foreground">
            Avise em 1 minuto: é só descrever e, se quiser, mandar uma foto.
          </p>
          <Button asChild size="lg">
            <Link href="/denuncia">
              <Plus className="mr-1.5 h-5 w-5" /> Registrar um problema
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
