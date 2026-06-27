"use client";

import { useState } from "react";
import { Check, Copy, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Ações do relatório: copiar o texto e imprimir/salvar em PDF. */
export function ReportToolbar({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={copy}>
        {copied ? <Check /> : <Copy />}
        {copied ? "Copiado!" : "Copiar texto"}
      </Button>
      <Button variant="outline" onClick={() => window.print()}>
        <Printer /> Imprimir / PDF
      </Button>
    </div>
  );
}
