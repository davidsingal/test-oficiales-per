"use client";

import { useMemo, useState } from "react";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";

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
  const [selectedYear, setSelectedYear] = useState<number>(
    examCalendar[0].year,
  );
  const [selectedDateId, setSelectedDateId] = useState<string>(
    examCalendar[0].dates[0].id,
  );
  const [selectedModelId, setSelectedModelId] = useState<string>(
    examCalendar[0].dates[0].models[0].id,
  );

  const years = examCalendar.map((group) => group.year);

  const yearData = useMemo(
    () =>
      examCalendar.find((group) => group.year === selectedYear) ??
      examCalendar[0],
    [selectedYear],
  );

  const dateData = useMemo(
    () =>
      yearData.dates.find((item) => item.id === selectedDateId) ??
      yearData.dates[0],
    [selectedDateId, yearData],
  );

  const modelData = useMemo(
    () =>
      dateData.models.find((item) => item.id === selectedModelId) ??
      dateData.models[0],
    [selectedModelId, dateData],
  );

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold">
          Selecciona convocatoria, fecha y modelo
        </h1>
        <p className="text-muted-foreground">
          Datos de ejemplo para definir el flujo real. Cada simulación está
          ajustada a 45 preguntas y 45 minutos.
        </p>
        <BackButton />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1.3fr_1fr]">
        <div className="space-y-4 rounded-md border p-4">
          <div>
            <h2 className="text-lg font-medium">Convocatorias por año</h2>
            <p className="text-sm text-muted-foreground">
              Desde 2021 hasta 2025, con 3 o 4 fechas por año.
            </p>
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Años de convocatoria"
          >
            {years.map((year) => (
              <Button
                key={year}
                type="button"
                variant={selectedYear === year ? "secondary" : "outline"}
                onClick={() => {
                  const nextYearData = examCalendar.find(
                    (group) => group.year === year,
                  );
                  if (!nextYearData) return;
                  setSelectedYear(year);
                  setSelectedDateId(nextYearData.dates[0].id);
                  setSelectedModelId(nextYearData.dates[0].models[0].id);
                }}
              >
                {year}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-2" aria-label="Fechas disponibles">
          {yearData.dates.map((date) => (
            <Button
              key={date.id}
              type="button"
              variant={selectedDateId === date.id ? "secondary" : "outline"}
              onClick={() => {
                setSelectedDateId(date.id);
                setSelectedModelId(date.models[0].id);
              }}
              className="h-auto w-full justify-start text-left"
            >
              <span className="flex flex-col items-start">
                <span>{date.label}</span>
                <span className="text-xs text-muted-foreground">
                  {date.models.length} modelos disponibles
                </span>
              </span>
            </Button>
          ))}
        </div>

        <aside className="space-y-3 rounded-md border p-4" aria-live="polite">
          <h3 className="font-medium">{dateData.label}</h3>
          <p className="text-sm text-muted-foreground">Selecciona el modelo:</p>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Modelos de examen"
          >
            {dateData.models.map((model) => (
              <Button
                key={model.id}
                type="button"
                variant={selectedModelId === model.id ? "secondary" : "outline"}
                onClick={() => setSelectedModelId(model.id)}
              >
                {model.name}
              </Button>
            ))}
          </div>

          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>{modelData.name}</li>
            <li>45 preguntas tipo test</li>
            <li>Tiempo total: 45 minutos</li>
          </ul>

          <Button type="button">Comenzar simulación</Button>
        </aside>
      </section>
    </main>
  );
}
