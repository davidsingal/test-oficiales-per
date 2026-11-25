"use client";

import { cn } from "@/lib/utils";
import { useProgress } from "@/lib/progress-store";

/** Saved status of one official test: last result, or "a medias". */
const ExamStatus = ({ examKey }: { examKey: string }) => {
  const record = useProgress().exams[examKey];
  if (!record) return null;

  if (record.inProgress) {
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        a medias
      </span>
    );
  }

  if (!record.last) return null;

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        record.last.passed
          ? "bg-success/10 text-success"
          : "bg-destructive/10 text-destructive",
      )}
    >
      {record.last.passed ? "APTO" : "NO APTO"}
    </span>
  );
};

export default ExamStatus;
