import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";

const topics = [
  "Normativa y reglamentacion",
  "Seguridad y prevencion",
  "Operaciones y maniobras",
  "Comunicaciones y protocolos",
];

export default function TestPorTemaPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <p className="text-sm text-muted-foreground">Test por tema</p>
        <h1 className="text-3xl font-semibold">Entrenamiento por bloques</h1>
        <p className="text-muted-foreground">
          Elige un tema para concentrarte en una parte concreta del temario.
        </p>
        <BackButton />
      </section>

      <section className="space-y-4 rounded-md border p-4">
        <h2 className="text-lg font-medium">Temas disponibles</h2>
        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <Button key={topic} type="button" variant="outline">
              {topic}
            </Button>
          ))}
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>45 preguntas por intento</li>
          <li>45 minutos de tiempo limite</li>
          <li>Progreso por tema (dummy)</li>
        </ul>
      </section>
    </main>
  );
}
