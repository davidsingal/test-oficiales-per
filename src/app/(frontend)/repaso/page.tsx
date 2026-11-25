import Breadcrumbs from "@/components/breadcrumbs";
import FailedReview from "@/components/quiz/failed-review";
import type { Metadata, NextPage } from "next";

export const metadata: Metadata = {
  title: "Repasar mis fallos · Exámenes oficiales PER",
};

const RepasoPage: NextPage = () => (
  <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
    <section className="space-y-2">
      <Breadcrumbs items={[{ label: "Repasar mis fallos" }]} />
      <h1 className="text-3xl font-semibold">Repasar mis fallos</h1>
      <p className="text-muted-foreground">
        Las preguntas que has fallado. Cuando aciertes una, desaparece de la
        lista. Tu progreso solo se guarda en este navegador.
      </p>
    </section>
    <FailedReview />
  </main>
);

export default RepasoPage;
