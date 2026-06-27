"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, BellRing, LoaderCircle, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { followSegment } from "@/lib/api-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/auth-browser";
import { CHANNEL_LABELS } from "@/lib/labels";
import { ALERT_CHANNELS, type AlertChannel } from "@/lib/types";

const fieldClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const AUTH_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** Botão "receber alertas" deste trecho (exige conta para não notificar todo mundo). */
export function FollowButton({ segmentId }: { segmentId: string }) {
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean>(!AUTH_ENABLED);
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<AlertChannel>("in_app");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setAuthed(Boolean(data.user)));
  }, []);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await followSegment({ segment_id: segmentId, channel });
      setDone(true);
      setOpen(false);
    } catch (err) {
      const msg = String(err);
      setError(
        /401/.test(msg) ? "Entre na sua conta para receber alertas." : "Não foi possível seguir.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Button variant="secondary" disabled className="w-full">
        <BellRing /> Você está acompanhando este trecho
      </Button>
    );
  }

  // Não logado: leva para o login mantendo o retorno à página atual.
  if (AUTH_ENABLED && !authed) {
    return (
      <Button asChild variant="outline" className="w-full">
        <Link href={`/login?next=${encodeURIComponent(pathname)}`}>
          <LogIn /> Entrar para receber alertas
        </Link>
      </Button>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Bell /> Receber alertas deste trecho
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <select
        className={fieldClass}
        value={channel}
        onChange={(e) => setChannel(e.target.value as AlertChannel)}
      >
        {ALERT_CHANNELS.map((c) => (
          <option key={c} value={c}>
            Canal: {CHANNEL_LABELS[c]}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={submit} disabled={loading} className="flex-1">
          {loading ? <LoaderCircle className="animate-spin" /> : <Bell />} Confirmar
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        E-mail e WhatsApp são simulados nesta versão — os alertas aparecem na sua central de
        notificações.
      </p>
    </div>
  );
}
