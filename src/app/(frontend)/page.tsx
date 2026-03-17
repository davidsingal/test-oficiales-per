import Link from "next/link";

const options = [
  {
    href: "/simular-examen",
    title: "Simular examen",
    description: "Selecciona convocatorias completas por año, fecha y modelo.",
  },
  {
    href: "/test-por-tema",
    title: "Test por tema",
    description: "Practica por bloques y refuerza contenidos concretos.",
  },
  {
    href: "/test-aleatorio",
    title: "Test aleatorio",
    description: "Entrena con combinaciones rápidas y variadas.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold">
          Elige tu modalidad de entrenamiento
        </h1>
        <p className="text-muted-foreground">
          Navega por las tres opciones para preparar tu examen.
        </p>
      </section>

      <section
        className="grid gap-3 md:grid-cols-3"
        aria-label="Modalidades disponibles"
      >
        {options.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className="rounded-md border p-4 text-sm hover:bg-muted"
          >
            <h3 className="font-medium">{option.title}</h3>
            <p className="mt-1 text-muted-foreground">{option.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
