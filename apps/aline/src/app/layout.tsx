import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studio Aline",
  description: "Painel interno de gestão de conteúdo — @scannerdasaude + @nutrisecrets",
  robots: { index: false, follow: false }, // sistema privado
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
