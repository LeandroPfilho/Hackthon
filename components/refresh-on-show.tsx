"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Revalida o Server Component pai sempre que a página volta a aparecer.
 *
 * Resolve o caso de "página defasada": uma rota dinâmica (ex.: /conta) que ficou
 * aberta numa aba, foi restaurada pelo botão Voltar (bfcache) ou reusada do
 * Router Cache do Next não rebusca os dados sozinha — então uma denúncia
 * recém-criada não aparecia em "Minhas denúncias" até dar F5.
 *
 * Forçamos router.refresh() ao montar (cobre navegação dentro do app / Router
 * Cache), ao voltar do bfcache (pageshow.persisted) e ao reabrir/focar a aba
 * (visibilitychange). router.refresh() não remonta este componente, então não
 * há laço.
 */
export function RefreshOnShow() {
  const router = useRouter();

  useEffect(() => {
    router.refresh();

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) router.refresh(); // restaurado do bfcache (botão Voltar)
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
