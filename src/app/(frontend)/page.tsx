import { PER } from "@/lib/licences";
import { SITE_NAME } from "@/lib/seo";
import Home from "@/views/home";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/", siteName: SITE_NAME, locale: "es_ES", type: "website" },
};

const HomePage = () => <Home licence={PER} />;

export default HomePage;
