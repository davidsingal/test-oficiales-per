import Link from "next/link";
import ProgressOverview from "@/components/progress/progress-overview";

const options = [
  {
    href: "/examenes-oficiales",
    title: "Exámenes oficiales",
    description: "Haz un examen completo de una convocatoria anterior.",
  },
  {
    href: "/test-por-tema",
    title: "Test por tema",
    description: "Practica un tema concreto, como el RIPA o el balizamiento.",
  },
  {
    href: "/test-aleatorio",
    title: "Test aleatorio",
    description: "10 preguntas al azar para un repaso rápido.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold">
          ¿Cómo quieres practicar?
        </h1>
        <p className="text-muted-foreground">
          Prepara el examen teórico del PER con las preguntas de los exámenes
          oficiales.
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

      <ProgressOverview />
    </main>
  );
}
