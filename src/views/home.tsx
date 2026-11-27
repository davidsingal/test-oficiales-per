import Link from "next/link";
import { ChevronRightIcon, FileTextIcon, LayersIcon, ShuffleIcon } from "lucide-react";
import ProgressOverview from "@/components/progress/progress-overview";
import { buttonVariants } from "@/components/ui/button-variants";
import { getExamSessions } from "@/lib/exam-sessions";
import { PER, PY, type Licence } from "@/lib/licences";
import { examPath, formatSessionLabel } from "@/lib/quiz";

const HEADLINES: Record<Licence["id"], string> = {
  per: "Prepara el PER con exámenes oficiales",
  py: "Prepara el Patrón de Yate con exámenes oficiales",
};

/** Where to send someone who is on the wrong licence's page. */
const OTHER: Record<Licence["id"], { licence: Licence; text: string }> = {
  per: { licence: PY, text: "¿Ya tienes el PER? Practica el examen de Patrón de Yate" },
  py: { licence: PER, text: "¿Aún no tienes el PER? Practica el examen del PER" },
};

/** Landing page of a licence: latest exam, the three ways to practise, progress. */
const Home = async ({ licence }: { licence: Licence }) => {
  const [latest] = await getExamSessions(licence.id);
  const latestTest = latest?.testNumbers[0];
  const other = OTHER[licence.id];

  const modes = [
    {
      href: `${licence.basePath}/examenes-oficiales`,
      title: "Exámenes oficiales",
      description: "Haz un examen completo de una convocatoria anterior.",
      Icon: FileTextIcon,
    },
    {
      href: `${licence.basePath}/test-por-tema`,
      title: "Test por tema",
      description: `Practica un tema concreto, ${licence.exampleTopics}.`,
      Icon: LayersIcon,
    },
    {
      href: `${licence.basePath}/test-aleatorio`,
      title: "Test aleatorio",
      description: "10 preguntas al azar para un repaso rápido.",
      Icon: ShuffleIcon,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl space-y-10 px-4 py-8 sm:py-12">
      <section className="space-y-5">
        <div className="space-y-3">
          <p className="text-sm font-medium text-primary">{licence.name}</p>
          <h1 className="text-3xl font-semibold sm:text-5xl">{HEADLINES[licence.id]}</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Preguntas y respuestas tal como las publicó el Ministerio de
            Transportes, con enlace al PDF original y las mismas reglas para
            aprobar.
          </p>
        </div>
        {latest && latestTest !== undefined && (
          <Link
            href={examPath(licence.id, latest.year, latest.month, latestTest)}
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
        <p className="text-sm">
          <Link
            href={other.licence.basePath || "/"}
            className="underline underline-offset-4 hover:text-primary"
          >
            {other.text}
          </Link>
        </p>
      </section>

      <ProgressOverview />
    </main>
  );
};

export default Home;
