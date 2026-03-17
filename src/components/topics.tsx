"use client";

import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { FC } from "react";
import type { Topic } from "@/types/data";

async function getTopics(): Promise<Topic[]> {
  return fetch("/data/topics.json").then((res) => res.json());
}

const TopicsList: FC = () => {
  const {
    data: topics,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["topics"],
    queryFn: () => getTopics(),
  });

  return (
    <section className="space-y-4 rounded-md border p-4">
      <h2 className="text-lg font-medium">Temas disponibles</h2>
      <div className="flex flex-wrap gap-2">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Cargando temas...</p>
        )}
        {!isLoading &&
          !isError &&
          topics
            ?.filter((topic) => topic.name !== "Carta de navegación") // Excluimos este tema por ahora
            .map((topic) => (
              <Button key={topic.id} type="button" variant="outline">
                {topic.name}
              </Button>
            ))}
        {isError && (
          <p className="text-sm text-red-500">
            Error al cargar los temas. Por favor, inténtalo de nuevo más tarde.
          </p>
        )}
      </div>
    </section>
  );
};

export default TopicsList;
