"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon } from "lucide-react";

export function BackButton() {
  const router = useRouter();

  return (
    <Button type="button" variant="outline" onClick={() => router.back()}>
      <ChevronLeftIcon />
      Volver
    </Button>
  );
}
