"use client";

import { usePathname } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  evaluateOfficialExam,
  getTrackedOfficialExamTopic,
  OFFICIAL_EXAM_ERROR_LIMITS,
} from "@/lib/official-exam-evaluation";
import { resetPathProgressAtom, testProgressAtom } from "@/store/test-progress";

type ReportProps = {
  totalQuestions: number;
  topicByQuestionId?: Record<number, string>;
};

const Report = ({ totalQuestions, topicByQuestionId }: ReportProps) => {
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

  const officialEvaluation = useMemo(() => {
    if (!topicByQuestionId) return null;

    const errorsByTopic = {
      ripa: 0,
      balizamiento: 0,
      cartaDeNavegacion: 0,
    };

    Object.entries(resultsByQuestion).forEach(([questionId, outcome]) => {
      if (outcome !== "incorrect") return;

      const topicName = topicByQuestionId[Number(questionId)];
      if (!topicName) return;

      const trackedTopic = getTrackedOfficialExamTopic(topicName);
      if (!trackedTopic) return;

      errorsByTopic[trackedTopic] += 1;
    });

    return evaluateOfficialExam({
      total: stats.failed,
      ...errorsByTopic,
    });
  }, [resultsByQuestion, stats.failed, topicByQuestionId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progreso del test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-4">
        <p>Por responder: {stats.left}</p>
        <p>Respondidas: {stats.answered}</p>
        <p className="text-green-700">Correctas: {stats.correct}</p>
        <p className="text-red-700">Falladas: {stats.failed}</p>
        </div>
        {officialEvaluation && (
          <div className="space-y-1 rounded-md border p-3">
            <p
              className={
                officialEvaluation.passed
                  ? stats.left === 0
                    ? "text-green-700"
                    : "text-amber-700"
                  : "text-red-700"
              }
            >
              Resultado oficial:{" "}
              {officialEvaluation.passed
                ? stats.left === 0
                  ? "APTO"
                  : "PENDIENTE"
                : "NO APTO"}
            </p>
            <p>
              Total: {officialEvaluation.counts.total}/
              {OFFICIAL_EXAM_ERROR_LIMITS.total} · RIPA:{" "}
              {officialEvaluation.counts.ripa}/{OFFICIAL_EXAM_ERROR_LIMITS.ripa} ·
              Balizamiento: {officialEvaluation.counts.balizamiento}/
              {OFFICIAL_EXAM_ERROR_LIMITS.balizamiento} · Carta de navegación:{" "}
              {officialEvaluation.counts.cartaDeNavegacion}/
              {OFFICIAL_EXAM_ERROR_LIMITS.cartaDeNavegacion}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Report;
