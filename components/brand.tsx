import Image from "next/image";

import logoMark from "@/assets/ui/logomark.png";
import wordmark from "@/assets/ui/wordmark.png";

// Proporções reais dos assets recortados (trim do respiro transparente).
const MARK_RATIO = 893 / 1134; // ~0,79 (w/h) — pin com folha
const WORD_RATIO = 1140 / 231; // ~4,94 (w/h) — tipografia "LinhaMap"

/** Símbolo da marca (pin/folha). Decorativo — a leitura fica no wordmark. */
export function LogoMark({
  height = 32,
  className,
  priority,
}: {
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={logoMark}
      alt=""
      aria-hidden
      width={Math.round(height * MARK_RATIO)}
      height={height}
      priority={priority}
      className={className}
    />
  );
}

/** Tipografia "LinhaMap" — carrega o nome acessível da marca. */
export function Wordmark({
  height = 22,
  className,
  priority,
}: {
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={wordmark}
      alt="LinhaMap"
      width={Math.round(height * WORD_RATIO)}
      height={height}
      priority={priority}
      className={className}
    />
  );
}
