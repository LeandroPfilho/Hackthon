"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { getOfflineReports, setOfflineReports } from "@/lib/offline";

/**
 * Esvazia a fila de denúncias offline quando há conexão.
 *
 * Roda ao montar (caso a conexão já tenha voltado antes de a página abrir) e a
 * cada evento `online` da window. Envia cada denúncia para `POST /api/reports`;
 * mantém na fila as que falharem (tentará de novo no próximo `online`). Um
 * `useRef` evita flushes concorrentes (ex.: mount + online quase juntos).
 */
export function useOfflineSync(): void {
  const syncing = useRef(false);

  useEffect(() => {
    async function flush() {
      if (syncing.current || typeof navigator === "undefined" || !navigator.onLine) return;
      syncing.current = true;
      try {
        const pending = await getOfflineReports();
        if (pending.length === 0) return;

        const remaining: typeof pending = [];
        let sent = 0;

        for (const item of pending) {
          const { saved_at: _savedAt, ...payload } = item;
          try {
            const res = await fetch("/api/reports", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (res.ok) sent += 1;
            else remaining.push(item);
          } catch {
            remaining.push(item); // sem rede / erro transitório → tenta depois
          }
        }

        await setOfflineReports(remaining);

        if (sent > 0) {
          toast.success(
            sent === 1
              ? "Sua denúncia salva no celular foi enviada."
              : `${sent} denúncias salvas no celular foram enviadas.`,
          );
        }
      } finally {
        syncing.current = false;
      }
    }

    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, []);
}
