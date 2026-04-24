"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

type Props = {
  pixelId: string;
  franqueadaId: string;
  funilVariante?: "lp_bridge" | "sofia_direto";
};

export function MetaPixel({ pixelId, franqueadaId, funilVariante = "lp_bridge" }: Props) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // captura fbclid da URL e grava em cookie pra uso server-side (Kiwify + CAPI)
    try {
      const params = new URLSearchParams(window.location.search);
      const fbclid = params.get("fbclid");
      if (fbclid) {
        const dias = 90;
        const expira = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `_fbclid=${encodeURIComponent(fbclid)}; expires=${expira}; path=/; SameSite=Lax`;
      }
      // Captura também funil_variante vindo do UTM (ad pode sobrescrever)
      const utmVariant = params.get("utm_variant");
      if (utmVariant) {
        document.cookie = `_funil_variante=${encodeURIComponent(utmVariant)}; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 30}`;
      } else {
        document.cookie = `_funil_variante=${encodeURIComponent(funilVariante)}; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 30}`;
      }
    } catch {}

    // dispara ViewContent quando usuario passa de 50% da pagina (engajamento real)
    let dispared = false;
    const onScroll = () => {
      if (dispared) return;
      const h = document.documentElement;
      const scrolled = (window.scrollY + window.innerHeight) / h.scrollHeight;
      if (scrolled > 0.5) {
        dispared = true;
        window.fbq?.("track", "ViewContent", {
          content_name: "LP Nutri",
          content_category: "health_consultation",
          franqueada_id: franqueadaId,
          funil_variante: funilVariante,
        });
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [franqueadaId, funilVariante]);

  if (!pixelId) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView', { franqueada_id: '${franqueadaId}' });
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}

/**
 * Dispara evento Lead quando a nutri-lead clica no CTA do WhatsApp.
 * Exportado como função pra ser chamada em onClick do botão.
 */
export function trackLead(franqueadaId: string, source: string) {
  if (typeof window === "undefined") return;
  window.fbq?.("track", "Lead", {
    content_name: "Agendar consulta WhatsApp",
    content_category: "health_consultation",
    franqueada_id: franqueadaId,
    source,
  });
}
