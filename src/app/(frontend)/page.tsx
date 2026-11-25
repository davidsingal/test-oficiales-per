import Link from "next/link";
import { ChevronRightIcon, FileTextIcon, LayersIcon, ShuffleIcon } from "lucide-react";
import ProgressOverview from "@/components/progress/progress-overview";
import { buttonVariants } from "@/components/ui/button-variants";
import { getExamSessions } from "@/lib/exam-sessions";
import { formatSessionLabel } from "@/lib/quiz";

export const dynamic = "force-dynamic";

const modes = [
  {
    href: "/examenes-oficiales",
    title: "Exámenes oficiales",
    description: "Haz un examen completo de una convocatoria anterior.",
    Icon: FileTextIcon,
  },
  {
    href: "/test-por-tema",
    title: "Test por tema",
    description: "Practica un tema concreto, como el RIPA o el balizamiento.",
    Icon: LayersIcon,
  },
  {
    href: "/test-aleatorio",
    title: "Test aleatorio",
    description: "10 preguntas al azar para un repaso rápido.",
    Icon: ShuffleIcon,
  },
];

export default async function HomePage() {
  const [latest] = await getExamSessions();
  const latestTest = latest?.testNumbers[0];

  return (
    <main className="mx-auto w-full max-w-5xl space-y-10 px-4 py-8 sm:py-12">
      <section className="space-y-5">
        <div className="space-y-3">
          <p className="text-sm font-medium text-primary">
            Patrón de Embarcaciones de Recreo
          </p>
          <h1 className="text-3xl font-semibold sm:text-5xl">
            Prepara el examen teórico del PER
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Practica con las preguntas de los exámenes oficiales del Patrón de
            Embarcaciones de Recreo, con la corrección oficial y las mismas
            reglas para aprobar.
          </p>
        </div>
        {latest && latestTest !== undefined && (
          <Link
            href={`/examenes-oficiales/${latest.year}/${latest.month}/${latestTest}`}
            className={buttonVariants({
              size: "lg",
              className: "h-auto min-h-11 px-4 py-2 text-left text-base whitespace-normal",
            })}
          >
            Hacer el último examen: {formatSessionLabel(latest.year, latest.month, latestTest)}
            <ChevronRightIcon />
          </Link>
        )}
      </section>

      <section aria-labelledby="modes-title" className="space-y-3">
        <h2 id="modes-title" className="text-lg font-semibold">
          ¿Cómo quieres practicar?
        </h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {modes.map((mode) => (
            <li key={mode.href}>
              <Link
                href={mode.href}
                className="group surface-link flex h-full items-start gap-3 p-4"
              >
                <span className="icon-badge">
                  <mode.Icon />
                </span>
                <span className="flex-1 space-y-1">
                  <span className="block font-medium">{mode.title}</span>
                  <span className="block text-sm text-muted-foreground">
                    {mode.description}
                  </span>
                </span>
                <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ProgressOverview />
    </main>
  );
}
