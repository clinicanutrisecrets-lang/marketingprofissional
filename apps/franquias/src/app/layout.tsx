import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scanner da Saúde — Plataforma Franquia Digital",
  description:
    "Marketing automatizado para nutricionistas franqueadas. LP personalizada, posts no Instagram, criativos e relatórios semanais — tudo gerenciado centralmente.",
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
