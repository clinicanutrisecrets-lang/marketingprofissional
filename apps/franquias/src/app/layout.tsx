import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.scannerdasaude.com"),
  title: "Scanner da Saúde — Plataforma Franquia Digital",
  description:
    "Marketing automatizado para nutricionistas franqueadas. LP personalizada, posts no Instagram, criativos e relatórios semanais — tudo gerenciado centralmente.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://app.scannerdasaude.com",
    siteName: "Scanner da Saúde",
    title: "Scanner da Saúde — Plataforma Franquia Digital",
    description:
      "Marketing automatizado para nutricionistas franqueadas. LP personalizada, posts no Instagram, criativos e relatórios semanais — tudo gerenciado centralmente.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <footer className="border-t border-brand-text/5 bg-white py-4 px-6 text-center text-xs text-brand-text/40">
          <div>© {new Date().getFullYear()} Scanner da Saúde · Clínica Nutri Secrets LTDA</div>
          <div className="mt-1">
            <a href="/privacidade" className="hover:underline">Privacidade</a>
            <span className="mx-2">·</span>
            <a href="/termos" className="hover:underline">Termos</a>
            <span className="mx-2">·</span>
            <a href="/deletar-dados" className="hover:underline">Excluir meus dados</a>
          </div>
          <div className="mt-1 text-brand-text/30">
            English:{" "}
            <a href="/en/privacy" className="hover:underline">Privacy</a>
            <span className="mx-2">·</span>
            <a href="/en/terms" className="hover:underline">Terms</a>
            <span className="mx-2">·</span>
            <a href="/en/data-deletion" className="hover:underline">Delete data</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
