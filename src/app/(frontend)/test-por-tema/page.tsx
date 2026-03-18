import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { BackButton } from "@/components/back-button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { NextPage } from "next";

const payload = await getPayload({ config });

const TestPorTemaPage: NextPage = async () => {
  const topics = await payload.find({
    collection: "topics",
    pagination: false,
    sort: ["createdAt"],
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
          <li>Corrección automática inmediata</li>
          <li>No incluye preguntas de Carta de navegación</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Temas disponibles</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {topics.docs
            ?.filter((d) => d.name !== "Carta de navegación") // Excluimos este tema por ahora
            .map((d) => (
              <Card key={`card-${d.id}`}>
                <CardHeader>
                  <CardTitle>
                    <Link
                      href={`/test-por-tema/${encodeURIComponent(d.name)}`}
                      passHref
                    >
                      {d.name}
                    </Link>
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
        </div>
      </section>
    </main>
  );
};

export default TestPorTemaPage;
