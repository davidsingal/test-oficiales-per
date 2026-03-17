import { BackButton } from "@/components/back-button";
import TopicsList from "@/components/topics-list";

export default async function TestPorTemaPage() {
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

      <TopicsList />
    </main>
  );
}
