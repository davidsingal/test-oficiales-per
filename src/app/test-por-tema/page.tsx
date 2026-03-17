import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { readFile } from "node:fs/promises";
import path from "node:path";

type Topic = {
  id: number;
  name: string;
  description: string;
};

async function getTopics(): Promise<Topic[]> {
  const topicsPath = path.join(process.cwd(), "public", "data", "topics.json");
  const file = await readFile(topicsPath, "utf-8");
  const parsed = JSON.parse(file) as Topic[];
  return parsed;
}

export default async function TestPorTemaPage() {
  const topics = await getTopics();

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
        </ul>
      </section>

      <section className="space-y-4 rounded-md border p-4">
        <h2 className="text-lg font-medium">Temas disponibles</h2>
        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <Button key={topic.id} type="button" variant="outline">
              {topic.name}
            </Button>
          ))}
        </div>
      </section>
    </main>
  );
}
