import Link from "next/link";

const options = [
  {
    href: "/simular-examen",
    title: "Simular examen",
    description: "Selecciona convocatorias completas por ano, fecha y modelo.",
  },
  {
    href: "/test-por-tema",
    title: "Test por tema",
    description: "Practica por bloques y refuerza contenidos concretos.",
  },
  {
    href: "/test-aleatorio",
    title: "Test aleatorio",
    description: "Entrena con combinaciones rapidas y variadas.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto grid w-[min(1120px,92vw)] gap-5 pb-12 pt-6">
      <section className="rounded-3xl border border-[var(--line)] bg-[linear-gradient(150deg,#fffefe,var(--surface))] p-6 shadow-[0_12px_35px_rgba(34,49,63,0.08)]">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-[var(--accent)]">
          Inicio
        </p>
        <h1 className="mt-1 text-[clamp(1.7rem,3vw,2.8rem)] leading-[1.1]">
          Elige tu modalidad de entrenamiento
        </h1>
        <p className="mt-4 max-w-[70ch] text-[var(--ink-muted)]">
          Navega por las tres opciones para preparar tu examen. Todas las vistas
          estan listas con datos de ejemplo y diseno responsive.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-3" aria-label="Modalidades disponibles">
        {options.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className="grid gap-1.5 rounded-[18px] border border-[var(--line)] bg-[var(--surface-muted)] p-4 text-[var(--ink)] no-underline transition hover:-translate-y-0.5 hover:border-[var(--accent)]"
          >
            <strong className="text-[1.02rem]">{option.title}</strong>
            <span className="text-[0.92rem] text-[var(--ink-muted)]">
              {option.description}
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
