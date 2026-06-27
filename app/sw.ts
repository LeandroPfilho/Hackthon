/// <reference lib="webworker" />
//
// Service Worker do LinhaMap (gerado pelo Serwist no build → public/sw.js).
// NÃO é type-checado pelo `tsc` do projeto: `app/sw.ts` está no `exclude` do
// tsconfig (usa globais de WebWorker que não estão no `lib` do app). O Serwist
// compila este arquivo à parte, com o lib correto.
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Injetado pelo Serwist no build com os assets a pré-cachear.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Estratégias Next-aware: páginas/RSC em NetworkFirst, estáticos com cache,
  // e /api fica fora do cache (não serve resposta velha de denúncia/score).
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
