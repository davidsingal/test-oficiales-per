"use client";

import { useQuery } from "@tanstack/react-query";
import type { Topic } from "@/types/data";

async function getTopics(): Promise<Topic[]> {
  return fetch("/data/topics.json").then((res) => res.json());
}

export function useTopics() {
  return useQuery({
    queryKey: ["topics"],
    queryFn: () => getTopics(),
  });
}
