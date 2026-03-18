"use client";

import { usePathname } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resetPathProgressAtom, testProgressAtom } from "@/store/test-progress";

const Report = ({ totalQuestions }: { totalQuestions: number }) => {
  const pathname = usePathname();
  const progressByPath = useAtomValue(testProgressAtom);
  const resetPathProgress = useSetAtom(resetPathProgressAtom);
  const resultsByQuestion = useMemo(
    () => progressByPath[pathname] ?? {},
    [progressByPath, pathname],
  );

  useEffect(() => {
    resetPathProgress(pathname);
  }, [pathname, totalQuestions, resetPathProgress]);

  const stats = useMemo(() => {
    const outcomes = Object.values(resultsByQuestion);
    const answered = outcomes.length;
    const correct = outcomes.filter((outcome) => outcome === "correct").length;
    const failed = outcomes.filter((outcome) => outcome === "incorrect").length;
    const left = Math.max(totalQuestions - answered, 0);

    return { answered, correct, failed, left };
  }, [resultsByQuestion, totalQuestions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progreso del test</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm sm:grid-cols-4">
        <p>Por responder: {stats.left}</p>
        <p>Respondidas: {stats.answered}</p>
        <p className="text-green-700">Correctas: {stats.correct}</p>
        <p className="text-red-700">Falladas: {stats.failed}</p>
      </CardContent>
    </Card>
  );
};

export default Report;
