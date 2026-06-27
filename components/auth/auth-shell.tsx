import Link from "next/link";

import { LogoMark } from "@/components/brand";

/**
 * Layout split-screen das telas de autenticação (adaptado do design Stitch):
 * painel de marca verde à esquerda (oculto no mobile) + formulário à direita.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel de marca — verde institucional, oculto em telas pequenas. */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <Link href="/" className="z-10 flex items-center gap-3" aria-label="LinhaMap — início">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
            <LogoMark height={24} priority />
          </span>
          <span className="text-xl font-bold tracking-tight">LinhaMap</span>
        </Link>

        <div className="z-10 max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            Antecipe riscos, evite prejuízos.
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80">
            A inteligência de dados conectando o campo à cidade — monitorando a
            trafegabilidade das linhas vicinais de Ariquemes/RO.
          </p>
        </div>

        <p className="z-10 text-sm text-primary-foreground/60">
          © LinhaMap · Trafegabilidade Rural
        </p>
      </div>

      {/* Formulário. */}
      <div className="flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
