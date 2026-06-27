// Espelho versionado do next-env.d.ts (que é gitignored e só é gerado pelo
// `next dev`/`next build`). Garante os tipos do Next no type-check do CI, onde
// rodamos apenas `npx tsc --noEmit` sem build — sem isto, imports de imagem
// (ex.: `@/assets/ui/logomark.png`) quebram com TS2307.
//
// Referências triple-slash são idempotentes: conviver com o next-env.d.ts
// local não causa conflito.
/// <reference types="next" />
/// <reference types="next/image-types/global" />
