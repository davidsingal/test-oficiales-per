import { PY } from "@/lib/licences";
import { pageMetadata } from "@/lib/seo";
import Home from "@/views/home";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Exámenes oficiales de Patrón de Yate con respuestas",
  description:
    "Exámenes reales de Patrón de Yate publicados por el Ministerio de Transportes, desde 2020, con la corrección oficial. Practica por convocatoria o por tema.",
  path: PY.basePath,
});

const PatronDeYatePage = () => <Home licence={PY} />;

export default PatronDeYatePage;
