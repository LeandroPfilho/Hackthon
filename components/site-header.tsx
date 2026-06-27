"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { AuthNav } from "@/components/auth/auth-nav";
import { LogoMark, Wordmark } from "@/components/brand";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/auth-browser";
import { cn } from "@/lib/utils";

const AUTH_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Links abertos a todos os visitantes.
const CITIZEN_NAV = [
  { href: "/", label: "Início" },
  { href: "/resumo", label: "Resumo" },
  { href: "/mapa", label: "Mapa" },
  { href: "/trajeto", label: "Trajeto" },
  { href: "/denuncia", label: "Denúncia" },
];
// Back-office — só aparece para a Secretaria.
const SECRETARIA_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/ordens", label: "Ordens" },
];
const TAIL_NAV = [{ href: "/sobre", label: "Sobre" }];

export function SiteHeader() {
  const pathname = usePathname();
  const [isSecretaria, setIsSecretaria] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Fecha o menu mobile ao navegar para outra rota.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Busca o papel da sessão (/api/me) e re-busca quando o login/logout muda.
  useEffect(() => {
    let active = true;
    const refresh = () =>
      fetch("/api/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => active && setIsSecretaria(d?.role === "secretaria"))
        .catch(() => active && setIsSecretaria(false));

    refresh();
    if (!AUTH_ENABLED) return () => {
      active = false;
    };
    const supabase = createSupabaseBrowserClient();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Telas de autenticação usam layout imersivo (split-screen) sem o cabeçalho.
  if (pathname === "/login" || pathname === "/cadastro") return null;

  const NAV = [...CITIZEN_NAV, ...(isSecretaria ? SECRETARIA_NAV : []), ...TAIL_NAV];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2" aria-label="LinhaMap — página inicial">
          <LogoMark height={32} priority />
          <Wordmark height={20} priority />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <NotificationBell />
          <AuthNav />
          <Button asChild size="sm" className="hidden shrink-0 sm:inline-flex">
            <Link href="/mapa">Ver mapa de risco</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {/* Menu mobile — abre com o hamburger em telas < lg. */}
      {menuOpen && (
        <nav
          id="mobile-nav"
          className="border-t bg-background lg:hidden"
        >
          <div className="container flex flex-col gap-1 py-3">
            {NAV.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <Button asChild size="sm" className="mt-2 w-full">
              <Link href="/mapa">Ver mapa de risco</Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
