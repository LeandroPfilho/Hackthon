/**
 * Cliente Supabase server-side para autenticação (lê/grava os cookies da sessão).
 * Diferente de getSupabaseAdmin (service role) — aqui usamos a chave pública e
 * o contexto do usuário logado para identificar quem está fazendo a requisição.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True quando as chaves públicas estão presentes (auth habilitada). */
export function authConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado de um Server Component (cookies somente leitura);
          // o middleware cuida de renovar a sessão.
        }
      },
    },
  });
}

/** Retorna o usuário autenticado (ou null se anônimo / auth desabilitada). */
export async function getSessionUser(): Promise<User | null> {
  if (!authConfigured()) return null;
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Lê o papel de uma conta a partir da tabela `profiles`.
 * Usa a service-role (mesmo padrão do SupabaseRepository); se não houver
 * service key, cai para o cliente user-scoped (a policy profiles_select_own
 * permite ler a própria linha). Default seguro: 'cidadao'.
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
    return (data?.role as UserRole) ?? "cidadao";
  } catch {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    return (data?.role as UserRole) ?? "cidadao";
  }
}

/** Usuário autenticado + seu papel (null se anônimo / auth desabilitada). */
export async function getSessionProfile(): Promise<{ user: User; role: UserRole } | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const role = await getUserRole(user.id);
  return { user, role };
}

/**
 * Decisão de acesso ao back-office (Secretaria).
 * IMPORTANTE: este é o enforcement REAL — o RLS não protege estas rotas
 * porque o app acessa o banco via service-role (bypassa RLS).
 * Em modo mock local (sem chaves públicas) libera tudo, espelhando o
 * comportamento atual e mantendo o dev local sem fricção.
 */
export type SecretariaAccess =
  | { allow: true; user: User | null }
  | { allow: false; status: 401 | 403 };

export async function checkSecretariaAccess(): Promise<SecretariaAccess> {
  if (!authConfigured()) return { allow: true, user: null }; // mock local = acesso total
  const user = await getSessionUser();
  if (!user) return { allow: false, status: 401 };
  const role = await getUserRole(user.id);
  if (role !== "secretaria") return { allow: false, status: 403 };
  return { allow: true, user };
}

/**
 * Guard para route handlers. Retorna `{ ok: true, user }` quando liberado,
 * ou `{ ok: false, response }` com um 401/403 pronto para retornar.
 */
export async function requireSecretariaApi(): Promise<
  { ok: true; user: User | null } | { ok: false; response: NextResponse }
> {
  const access = await checkSecretariaAccess();
  if (access.allow) return { ok: true, user: access.user };
  const error =
    access.status === 401 ? "Autenticação necessária." : "Acesso restrito à Secretaria.";
  return { ok: false, response: NextResponse.json({ error }, { status: access.status }) };
}
