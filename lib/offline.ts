/**
 * Fila de denúncias salvas no dispositivo (offline-first).
 *
 * Usa IndexedDB via `idb-keyval` (não o localStorage, por causa do limite de
 * ~5 MB — as fotos vêm em base64). O formulário grava aqui quando está sem
 * internet; o hook `useOfflineSync` esvazia a fila quando a conexão volta.
 */
import { del, get, set } from "idb-keyval";

/** Chave única da fila no IndexedDB. */
export const OFFLINE_KEY = "denuncias_offline";

/**
 * Uma denúncia pendente = exatamente o payload enviado a `POST /api/reports`
 * (ver `createReport`), mais o instante em que foi salva. Categoria/severidade
 * são opcionais (a IA classifica no servidor quando ausentes).
 */
export interface OfflineReport {
  reporter_name: string | null;
  phone: string | null;
  road_segment_id: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string;
  image_url: string | null;
  category?: string;
  severity?: string;
  /** epoch ms — só para ordenação/diagnóstico; removido antes de enviar. */
  saved_at: number;
}

/** Payload da denúncia sem os metadados locais. */
export type OfflineReportInput = Omit<OfflineReport, "saved_at">;

/** Lê a fila atual (array vazio se não houver nada). */
export async function getOfflineReports(): Promise<OfflineReport[]> {
  return (await get<OfflineReport[]>(OFFLINE_KEY)) ?? [];
}

/** Acrescenta uma denúncia à fila. */
export async function saveOfflineReport(input: OfflineReportInput): Promise<void> {
  const queue = await getOfflineReports();
  queue.push({ ...input, saved_at: Date.now() });
  await set(OFFLINE_KEY, queue);
}

/** Regrava a fila; se ficar vazia, remove a chave do IndexedDB. */
export async function setOfflineReports(queue: OfflineReport[]): Promise<void> {
  if (queue.length === 0) {
    await del(OFFLINE_KEY);
  } else {
    await set(OFFLINE_KEY, queue);
  }
}
