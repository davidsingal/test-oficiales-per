import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { BackButton } from "@/components/back-button";
import type { NextPage } from "next";

const payload = await getPayload({ config });

const TestPorTemaPage: NextPage = async () => {
  const topics = await payload.find({
    collection: "topics",
    pagination: false,
  });

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <BackButton />
        <h1 className="text-3xl font-semibold">Entrenamiento por bloques</h1>
        <p className="text-muted-foreground">
          Elige un tema para concentrarte en una parte concreta del temario.
          Ideal para reforzar áreas específicas o practicar temas que te
          resulten más difíciles.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>10 preguntas por intento</li>
          <li>10 minutos de tiempo límite</li>
          <li>Resultados al finalizar el intento</li>
          <li>No incluye preguntas de Carta de navegación</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Temas disponibles</h2>
        <ul className="space-y-4">
          {topics.docs
            ?.filter((d) => d.name !== "Carta de navegación") // Excluimos este tema por ahora
            .map((d) => (
              <li key={`topic-${d.id}`}>
                <Link
                  href={`/test-por-tema/${encodeURIComponent(d.name)}`}
                  passHref
                  className="rounded-md border p-2 block hover:bg-gray-100 transition-colors"
                >
                  {d.name}
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
};

export default TestPorTemaPage;
