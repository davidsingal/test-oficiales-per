import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Navbar } from "@/components/navbar";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Exámenes oficiales PER",
  description:
    "Practica con los exámenes oficiales del Patrón de Embarcaciones de Recreo (PER): por convocatoria, por tema o al azar.",
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
