"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useTopics } from "@/hooks/fetchTopics";
import type { FC } from "react";

const TopicsList: FC = () => {
  const router = useRouter();
  const { data: topics, isLoading, isError } = useTopics();

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
              <Button
                key={topic.id}
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(
                    `/test-por-tema/${encodeURIComponent(topic.name)}`,
                  )
                }
              >
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
