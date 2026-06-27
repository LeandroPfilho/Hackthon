import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<typeof Button>;

// Apenas dígitos. Sem número configurado → o botão não aparece.
const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

/**
 * Botão "Denunciar pelo Zap": abre o WhatsApp com um texto pronto.
 * Entrada de baixíssima fricção para o produtor rural. Só renderiza quando
 * `NEXT_PUBLIC_WHATSAPP_NUMBER` está definido (ex.: na Vercel).
 *
 * O texto pronto já vem com a palavra-chave do agente (`linhamap-hackathon`),
 * que ativa o fluxo no n8n/WAHA — o assistente responde guiando a denúncia.
 */
export function WhatsappCta({
  label = "Denunciar pelo Zap",
  message = "linhamap-hackathon quero denunciar",
  size = "lg",
  variant = "secondary",
  className,
}: {
  label?: string;
  message?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
}) {
  if (!WHATSAPP_NUMBER) return null;
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  return (
    <Button asChild size={size} variant={variant} className={cn(className)}>
      <Link href={href} target="_blank" rel="noopener noreferrer">
        <MessageCircle /> {label}
      </Link>
    </Button>
  );
}
