/**
 * Cliente Supabase server-side (service role).
 * Usado apenas quando ENABLE_MOCK_DATA=false e há credenciais.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { config } from "@/lib/config";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error(
      "Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!cached) {
    cached = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false },
      // Evita o Data Cache do Next em consultas server-side (dados sempre frescos).
      // Sem isso, o fetch do Supabase em Server Components pode servir dados defasados
      // (ex.: o Dashboard ficava sem as denúncias mais recentes).
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    });
  }
  return cached;
}
