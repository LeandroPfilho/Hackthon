/**
 * Factory do repositório — escolhe mock ou supabase conforme a configuração.
 * Cache em globalThis preserva o estado mock entre requisições no mesmo processo.
 */
import { isSupabaseMode } from "@/lib/config";

import type { Repository } from "./base";
import { MockRepository } from "./mock";
import { SupabaseRepository } from "./supabase";

export type { Repository, ReportFilters } from "./base";

const globalForRepo = globalThis as unknown as { __linhamapRepo?: Repository };

export function getRepository(): Repository {
  if (!globalForRepo.__linhamapRepo) {
    globalForRepo.__linhamapRepo = isSupabaseMode()
      ? new SupabaseRepository()
      : new MockRepository();
  }
  return globalForRepo.__linhamapRepo;
}
