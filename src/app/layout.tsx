import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance OS",
  description: "Copiloto financeiro com IA, upload inteligente e visão patrimonial."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
