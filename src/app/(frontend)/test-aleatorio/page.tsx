import { BackButton } from "@/components/back-button";

export default function TestAleatorioPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <BackButton />
        <h1 className="text-3xl font-semibold">Practica dinámica y variada</h1>
        <p className="text-muted-foreground">
          Genera tests combinados para entrenar reflejos y consolidar conceptos.
          Ideal como test de repaso o para practicar de forma rápida y efectiva.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>10 preguntas por ronda</li>
          <li>10 minutos máximo</li>
          <li>No incluye preguntas de Carta de navegación</li>
        </ul>
      </section>

      <section className="space-y-4 rounded-md border p-4"></section>
    </main>
  );
}
