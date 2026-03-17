import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";

const randomModes = [
  "Dificultad mixta",
  "Solo preguntas nuevas",
  "Reforzar falladas",
  "Modo contrarreloj",
];

export default function TestAleatorioPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold">Practica dinamica y variada</h1>
        <p className="text-muted-foreground">
          Genera tests combinados para entrenar reflejos y consolidar conceptos.
        </p>
        <BackButton />
      </section>

      <section className="space-y-4 rounded-md border p-4">
        <h2 className="text-lg font-medium">Configuraciones rapidas</h2>
        <div className="flex flex-wrap gap-2">
          {randomModes.map((mode) => (
            <Button key={mode} type="button" variant="outline">
              {mode}
            </Button>
          ))}
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>45 preguntas por ronda</li>
          <li>45 minutos maximo</li>
          <li>Seleccion de preguntas aleatoria (dummy)</li>
        </ul>
      </section>
    </main>
  );
}
