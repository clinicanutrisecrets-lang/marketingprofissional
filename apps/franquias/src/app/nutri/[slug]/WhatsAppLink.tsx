"use client";

import type { CSSProperties, ReactNode } from "react";
import { trackLead } from "@/components/MetaPixel";

type Props = {
  href: string;
  franqueadaId: string;
  source: "topbar" | "hero" | "jornada" | "cta_final" | "footer";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function WhatsAppLink({
  href,
  franqueadaId,
  source,
  className,
  style,
  children,
}: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackLead(franqueadaId, source)}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}
