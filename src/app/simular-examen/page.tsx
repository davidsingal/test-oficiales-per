"use client";

import { useMemo, useState } from "react";
import { BackButton } from "@/components/back-button";

type TestModel = {
  id: string;
  name: string;
};

type ExamDate = {
  id: string;
  label: string;
  models: TestModel[];
};

type YearGroup = {
  year: number;
  dates: ExamDate[];
};

const examCalendar: YearGroup[] = [
  {
    year: 2025,
    dates: [
      {
        id: "2025-02-15",
        label: "15 febrero 2025",
        models: [
          { id: "2025-02-15-a", name: "Modelo A" },
          { id: "2025-02-15-b", name: "Modelo B" },
          { id: "2025-02-15-c", name: "Modelo C" },
        ],
      },
      {
        id: "2025-06-12",
        label: "12 junio 2025",
        models: [
          { id: "2025-06-12-a", name: "Modelo A" },
          { id: "2025-06-12-b", name: "Modelo B" },
        ],
      },
      {
        id: "2025-09-20",
        label: "20 septiembre 2025",
        models: [
          { id: "2025-09-20-a", name: "Modelo A" },
          { id: "2025-09-20-b", name: "Modelo B" },
          { id: "2025-09-20-c", name: "Modelo C" },
          { id: "2025-09-20-d", name: "Modelo D" },
        ],
      },
      {
        id: "2025-12-14",
        label: "14 diciembre 2025",
        models: [
          { id: "2025-12-14-a", name: "Modelo A" },
          { id: "2025-12-14-b", name: "Modelo B" },
        ],
      },
    ],
  },
  {
    year: 2024,
    dates: [
      {
        id: "2024-02-10",
        label: "10 febrero 2024",
        models: [
          { id: "2024-02-10-a", name: "Modelo A" },
          { id: "2024-02-10-b", name: "Modelo B" },
        ],
      },
      {
        id: "2024-05-05",
        label: "5 mayo 2024",
        models: [
          { id: "2024-05-05-a", name: "Modelo A" },
          { id: "2024-05-05-b", name: "Modelo B" },
          { id: "2024-05-05-c", name: "Modelo C" },
        ],
      },
      {
        id: "2024-09-21",
        label: "21 septiembre 2024",
        models: [
          { id: "2024-09-21-a", name: "Modelo A" },
          { id: "2024-09-21-b", name: "Modelo B" },
          { id: "2024-09-21-c", name: "Modelo C" },
        ],
      },
      {
        id: "2024-11-30",
        label: "30 noviembre 2024",
        models: [
          { id: "2024-11-30-a", name: "Modelo A" },
          { id: "2024-11-30-b", name: "Modelo B" },
        ],
      },
    ],
  },
  {
    year: 2023,
    dates: [
      {
        id: "2023-03-18",
        label: "18 marzo 2023",
        models: [
          { id: "2023-03-18-a", name: "Modelo A" },
          { id: "2023-03-18-b", name: "Modelo B" },
          { id: "2023-03-18-c", name: "Modelo C" },
        ],
      },
      {
        id: "2023-06-24",
        label: "24 junio 2023",
        models: [
          { id: "2023-06-24-a", name: "Modelo A" },
          { id: "2023-06-24-b", name: "Modelo B" },
        ],
      },
      {
        id: "2023-10-07",
        label: "7 octubre 2023",
        models: [
          { id: "2023-10-07-a", name: "Modelo A" },
          { id: "2023-10-07-b", name: "Modelo B" },
          { id: "2023-10-07-c", name: "Modelo C" },
          { id: "2023-10-07-d", name: "Modelo D" },
        ],
      },
    ],
  },
  {
    year: 2022,
    dates: [
      {
        id: "2022-02-19",
        label: "19 febrero 2022",
        models: [
          { id: "2022-02-19-a", name: "Modelo A" },
          { id: "2022-02-19-b", name: "Modelo B" },
        ],
      },
      {
        id: "2022-06-11",
        label: "11 junio 2022",
        models: [
          { id: "2022-06-11-a", name: "Modelo A" },
          { id: "2022-06-11-b", name: "Modelo B" },
          { id: "2022-06-11-c", name: "Modelo C" },
        ],
      },
      {
        id: "2022-10-29",
        label: "29 octubre 2022",
        models: [
          { id: "2022-10-29-a", name: "Modelo A" },
          { id: "2022-10-29-b", name: "Modelo B" },
        ],
      },
    ],
  },
  {
    year: 2021,
    dates: [
      {
        id: "2021-03-13",
        label: "13 marzo 2021",
        models: [
          { id: "2021-03-13-a", name: "Modelo A" },
          { id: "2021-03-13-b", name: "Modelo B" },
          { id: "2021-03-13-c", name: "Modelo C" },
        ],
      },
      {
        id: "2021-07-17",
        label: "17 julio 2021",
        models: [
          { id: "2021-07-17-a", name: "Modelo A" },
          { id: "2021-07-17-b", name: "Modelo B" },
        ],
      },
      {
        id: "2021-11-13",
        label: "13 noviembre 2021",
        models: [
          { id: "2021-11-13-a", name: "Modelo A" },
          { id: "2021-11-13-b", name: "Modelo B" },
          { id: "2021-11-13-c", name: "Modelo C" },
        ],
      },
    ],
  },
];

export default function SimularExamenPage() {
  const [selectedYear, setSelectedYear] = useState<number>(examCalendar[0].year);
  const [selectedDateId, setSelectedDateId] = useState<string>(examCalendar[0].dates[0].id);
  const [selectedModelId, setSelectedModelId] = useState<string>(
    examCalendar[0].dates[0].models[0].id,
  );

  const years = examCalendar.map((group) => group.year);

  const yearData = useMemo(
    () => examCalendar.find((group) => group.year === selectedYear) ?? examCalendar[0],
    [selectedYear],
  );

  const dateData = useMemo(
    () => yearData.dates.find((item) => item.id === selectedDateId) ?? yearData.dates[0],
    [selectedDateId, yearData],
  );

  const modelData = useMemo(
    () => dateData.models.find((item) => item.id === selectedModelId) ?? dateData.models[0],
    [selectedModelId, dateData],
  );

  return (
    <main className="mx-auto grid w-[min(1120px,92vw)] gap-5 pb-12 pt-6">
      <section className="rounded-3xl border border-[var(--line)] bg-[linear-gradient(150deg,#fffefe,var(--surface))] p-6 shadow-[0_12px_35px_rgba(34,49,63,0.08)]">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-[var(--accent)]">
          Simular examen
        </p>
        <h1 className="mt-1 text-[clamp(1.7rem,3vw,2.8rem)] leading-[1.1]">
          Selecciona convocatoria, fecha y modelo
        </h1>
        <p className="mt-4 max-w-[70ch] text-[var(--ink-muted)]">
          Datos de ejemplo para definir el flujo real. Cada simulacion esta ajustada
          a 45 preguntas y 45 minutos.
        </p>
        <BackButton />
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[linear-gradient(150deg,#fffefe,var(--surface))] p-5 shadow-[0_12px_35px_rgba(34,49,63,0.08)]">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1.3fr_1fr]">
          <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <h2 className="m-0 text-[1.15rem]">Convocatorias por ano</h2>
            <p className="mt-2 text-[var(--ink-muted)]">
              Desde 2021 hasta 2025, con 3 o 4 fechas por ano.
            </p>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Anos de convocatoria">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => {
                    const nextYearData = examCalendar.find((group) => group.year === year);
                    if (!nextYearData) return;
                    setSelectedYear(year);
                    setSelectedDateId(nextYearData.dates[0].id);
                    setSelectedModelId(nextYearData.dates[0].models[0].id);
                  }}
                  className={
                    "rounded-full border border-[var(--line)] bg-[#f8fbff] px-3 py-1.5 font-semibold" +
                    (selectedYear === year
                      ? " border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "")
                  }
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2" aria-label="Fechas disponibles">
            {yearData.dates.map((date) => (
              <button
                key={date.id}
                type="button"
                onClick={() => {
                  setSelectedDateId(date.id);
                  setSelectedModelId(date.models[0].id);
                }}
                className={
                  "grid gap-1 rounded-xl border border-[var(--line)] bg-[#fcfcfc] p-3 text-left" +
                  (selectedDateId === date.id
                    ? " border-[var(--accent)] bg-[#effaf8]"
                    : "")
                }
              >
                <strong>{date.label}</strong>
                <small className="text-[var(--ink-muted)]">
                  {date.models.length} modelos disponibles
                </small>
              </button>
            ))}
          </div>

          <aside className="rounded-2xl border border-[var(--line)] bg-white p-4" aria-live="polite">
            <h3 className="m-0">{dateData.label}</h3>
            <p className="my-2">Selecciona el modelo:</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Modelos de examen">
              {dateData.models.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setSelectedModelId(model.id)}
                  className={
                    "rounded-full border border-[var(--line)] bg-[#f8fbff] px-3 py-1.5 font-semibold" +
                    (selectedModelId === model.id
                      ? " border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "")
                  }
                >
                  {model.name}
                </button>
              ))}
            </div>
            <ul className="mt-4 grid list-disc gap-1 pl-5 text-[var(--ink-muted)]">
              <li>{modelData.name}</li>
              <li>45 preguntas tipo test</li>
              <li>Tiempo total: 45 minutos</li>
            </ul>
            <button
              type="button"
              className="mt-4 rounded-[10px] bg-[var(--accent)] px-4 py-2.5 font-bold text-white"
            >
              Comenzar simulacion
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
}
