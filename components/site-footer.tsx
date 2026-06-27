"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Wordmark } from "@/components/brand";

export function SiteFooter() {
  const pathname = usePathname();
  // Telas de autenticação usam layout imersivo (split-screen) sem o rodapé.
  if (pathname === "/login" || pathname === "/cadastro") return null;

  return (
    <footer className="border-t bg-muted/30 print:hidden">
      <div className="container flex flex-col items-center justify-between gap-3 py-6 text-sm text-muted-foreground sm:flex-row">
        <p className="flex flex-wrap items-center justify-center gap-1.5">
          <Wordmark height={15} />
          <span>— Trafegabilidade rural preditiva para Ariquemes/RO.</span>
        </p>
        <p className="flex items-center gap-3">
          <span>Hackathon IFRO Ariquemes 2026/1</span>
          <Link href="/sobre" className="hover:text-foreground">
            Sobre o projeto
          </Link>
        </p>
      </div>
    </footer>
  );
}
