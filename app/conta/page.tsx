import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, BellOff, FileText, MapPin } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { RefreshOnShow } from "@/components/refresh-on-show";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS, CHANNEL_LABELS, SEVERITY_LABELS, STATUS_LABELS } from "@/lib/labels";
import { getRepository } from "@/lib/repository";
import { authConfigured, getSessionProfile } from "@/lib/supabase/auth-server";
import type { AlertChannel } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Minha conta — LinhaMap" };

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function ContaPage() {
  if (!authConfigured()) {
    return (
      <div className="container max-w-2xl py-16">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            As contas de usuário ainda não estão configuradas neste ambiente.
          </CardContent>
        </Card>
      </div>
    );
  }

  const profile = await getSessionProfile();
  if (!profile) redirect("/login?next=/conta");
  const { user, role } = profile;
  const isSecretaria = role === "secretaria";

  const repo = getRepository();
  const [reports, follows, notifications] = await Promise.all([
    repo.listReports({ user_id: user.id }),
    repo.listFollows(undefined, user.id),
    repo.listNotifications(50, user.id),
  ]);

  return (
    <div className="container max-w-3xl py-10">
      {/* Mantém "Minhas denúncias" fresco ao voltar (bfcache) / reabrir a aba. */}
      <RefreshOnShow />
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Minha conta</h1>
            <span
              className={
                isSecretaria
                  ? "rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
                  : "rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground"
              }
            >
              {isSecretaria ? "Secretaria de Obras" : "Cidadão"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InstallPwaButton />
          <LogoutButton variant="outline" />
        </div>
      </div>

      {isSecretaria && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/dashboard">Abrir dashboard</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/ordens">Ordens de serviço</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/relatorios">Relatório semanal</Link>
          </Button>
        </div>
      )}

      {/* Notificações */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Bell className="h-5 w-5" /> Minhas notificações
        </h2>
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
              <BellOff className="h-8 w-8" />
              <p className="text-sm">
                Nenhum alerta ainda. Siga um trecho no{" "}
                <Link href="/mapa" className="text-primary hover:underline">
                  mapa
                </Link>{" "}
                para ser avisado quando o risco aumentar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {notifications.map((n) => (
              <li key={n.id}>
                <Card>
                  <CardContent className="flex items-start gap-3 p-4">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bell className="h-4 w-4" />
                    </span>
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <RiskBadge level={n.level} />
                        <span className="text-xs text-muted-foreground">
                          via {CHANNEL_LABELS[n.channel as AlertChannel]}
                          {n.status === "simulada" && " (simulado)"}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {formatDateTime(n.created_at)}
                        </span>
                      </div>
                      <p className="text-sm">{n.message}</p>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Inscrições (follows) */}
      {follows.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <MapPin className="h-5 w-5" /> Trechos que acompanho ({follows.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {follows.map((f) => (
              <span
                key={f.id}
                className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
              >
                {CHANNEL_LABELS[f.channel as AlertChannel]}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Denúncias */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5" /> Minhas denúncias
          </h2>
          <Button asChild size="sm" variant="outline">
            <Link href="/denuncia">Nova denúncia</Link>
          </Button>
        </div>
        {reports.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Você ainda não registrou denúncias.
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {reports.map((r) => (
              <li key={r.id}>
                <Card>
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                        {CATEGORY_LABELS[r.category]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Severidade: {SEVERITY_LABELS[r.severity]}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatDateTime(r.created_at)}
                      </span>
                    </div>
                    {r.description && <p className="text-sm">{r.description}</p>}
                    <span className="text-xs text-muted-foreground">
                      Status: {STATUS_LABELS[r.status]}
                    </span>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
