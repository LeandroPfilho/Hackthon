import { redirect } from "next/navigation";
import { Bell, BellOff } from "lucide-react";

import { RiskBadge } from "@/components/risk-badge";
import { Card, CardContent } from "@/components/ui/card";
import { CHANNEL_LABELS } from "@/lib/labels";
import { getRepository } from "@/lib/repository";
import { authConfigured, getSessionUser } from "@/lib/supabase/auth-server";
import type { AlertChannel } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Alertas — LinhaMap" };

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Central de alertas (notificações pessoais ao seguir trechos). */
export default async function NotificacoesPage() {
  const user = await getSessionUser();
  if (authConfigured() && !user) redirect("/login?next=/notificacoes");
  const repo = getRepository();
  const [notifications, follows] = await Promise.all([
    repo.listNotifications(50, user?.id),
    repo.listFollows(undefined, user?.id),
  ]);

  return (
    <div className="container max-w-3xl py-10">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Central de alertas</h1>
        <p className="text-muted-foreground">
          Notificações dos trechos que você acompanha. Siga um trecho no mapa para receber
          avisos quando o risco aumentar.
        </p>
      </div>

      {follows.length > 0 && (
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-2 p-5">
            <h2 className="text-sm font-semibold">
              Acompanhando {follows.length} inscrição(ões)
            </h2>
            <div className="flex flex-wrap gap-2">
              {follows.map((f) => (
                <span
                  key={f.id}
                  className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                >
                  {f.name || "Anônimo"} · {CHANNEL_LABELS[f.channel as AlertChannel]}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center text-muted-foreground">
            <BellOff className="h-10 w-10" />
            <p>
              Nenhum alerta ainda. Vá ao <strong>mapa</strong>, abra um trecho e clique em
              <em> &quot;Receber alertas deste trecho&quot;</em>.
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
    </div>
  );
}
