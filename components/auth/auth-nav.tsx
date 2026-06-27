"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/auth-browser";

const AUTH_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** Mostra Entrar/Cadastrar (deslogado) ou Conta/Sair (logado) no cabeçalho. */
export function AuthNav() {
  const [status, setStatus] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setStatus(data.user ? "in" : "out"));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session?.user ? "in" : "out");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!AUTH_ENABLED || status === "loading") return null;

  if (status === "in") {
    return (
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm">
          <Link href="/conta">
            <UserRound /> <span className="hidden sm:inline">Conta</span>
          </Link>
        </Button>
        <LogoutButton />
      </div>
    );
  }

  return (
    <Button asChild variant="ghost" size="sm">
      <Link href="/login">
        <UserRound /> <span className="hidden sm:inline">Entrar</span>
      </Link>
    </Button>
  );
}
