import { BackButton } from "@/components/back-button";

const topics = [
  "Normativa y reglamentacion",
  "Seguridad y prevencion",
  "Operaciones y maniobras",
  "Comunicaciones y protocolos",
];

export default function TestPorTemaPage() {
  return (
    <main className="mx-auto grid w-[min(1120px,92vw)] gap-5 pb-12 pt-6">
      <section className="rounded-3xl border border-[var(--line)] bg-[linear-gradient(150deg,#fffefe,var(--surface))] p-6 shadow-[0_12px_35px_rgba(34,49,63,0.08)]">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-[var(--accent)]">
          Test por tema
        </p>
        <h1 className="mt-1 text-[clamp(1.7rem,3vw,2.8rem)] leading-[1.1]">
          Entrenamiento por bloques
        </h1>
        <p className="mt-4 max-w-[70ch] text-[var(--ink-muted)]">
          Elige un tema para concentrarte en una parte concreta del temario.
          Esta pantalla usa configuracion de ejemplo para la interfaz.
        </p>
        <BackButton />
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[linear-gradient(150deg,#fffefe,var(--surface))] p-5 shadow-[0_12px_35px_rgba(34,49,63,0.08)]">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
          <h2 className="m-0 text-[1.15rem]">Temas disponibles</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {topics.map((topic) => (
              <button
                key={topic}
                type="button"
                className="rounded-[10px] border border-[var(--line)] bg-slate-50 px-3 py-2 text-[var(--ink)]"
              >
                {topic}
              </button>
            ))}
          </div>
          <ul className="mt-4 grid list-disc gap-1 pl-5 text-[var(--ink-muted)]">
            <li>45 preguntas por intento</li>
            <li>45 minutos de tiempo limite</li>
            <li>Progreso por tema (dummy)</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
