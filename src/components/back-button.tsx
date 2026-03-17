"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();

  return (
    <Button type="button" variant="outline" onClick={() => router.back()}>
      Volver
    </Button>
  );
}
