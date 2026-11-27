import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Navbar } from "@/components/navbar";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Exámenes oficiales PER con respuestas | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Exámenes reales del PER publicados por el Ministerio de Transportes, desde 2020, con la corrección oficial. Practica por convocatoria o por tema.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} antialiased`}
      >
        <Navbar />
        <Providers>{children}</Providers>
        <footer className="mx-auto mt-auto w-full max-w-5xl px-4 pt-6 pb-10 text-sm text-muted-foreground">
          <p className="border-t pt-6">
            Preguntas y respuestas de los exámenes oficiales publicados por el
            Ministerio de Transportes. Tu progreso solo se guarda en este navegador.
          </p>
          <p className="pt-2">
            Web independiente, no vinculada al Ministerio de Transportes.
          </p>
        </footer>
      </body>
      {process.env.NODE_ENV === "production" && (
        <GoogleAnalytics
          gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || ""}
        />
      )}
    </html>
  );
}
