"use client";

import { useOfflineSync } from "@/hooks/useOfflineSync";

/**
 * Componente invisível montado no layout: dispara a sincronização das denúncias
 * offline de qualquer página assim que a conexão volta.
 */
export function OfflineSync() {
  useOfflineSync();
  return null;
}
