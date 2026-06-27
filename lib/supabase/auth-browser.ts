"use client";

/**
 * Cliente Supabase para o browser (autenticação).
 * Usa a chave pública (anon) — a sessão é persistida em cookies legíveis
 * pelo servidor, então Server Components e Route Handlers reconhecem o login.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
