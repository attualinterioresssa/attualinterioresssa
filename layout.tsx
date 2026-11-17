import "./globals.css";
import type { Metadata, Viewport } from "next";
import CookieConsent from "@/components/CookieConsent";

export const metadata: Metadata = {
  title: "Móveis planejados sob medida | Attual Interiores",
  description: "Cozinhas, guarda-roupas, quartos, painéis, banheiros e escritórios sob medida em Salvador.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&family=Cormorant+Garamond:wght@400;500&display=swap" />
      </head>
      <body>{children}<CookieConsent /></body>
    </html>
  );
}
