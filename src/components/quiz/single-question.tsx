"use client";

import { useState } from "react";
import type { AnswerLetter, QuizQuestion } from "@/lib/quiz";
import QuestionCard from "./question-card";

/** One question with immediate correction, used for shared question links. */
const SingleQuestion = ({ question }: { question: QuizQuestion }) => {
  const [selected, setSelected] = useState<AnswerLetter>();

  return (
    <QuestionCard
      question={question}
      selected={selected}
      onSelect={setSelected}
      revealed={Boolean(selected)}
      locked={Boolean(selected)}
      showTopic
      showSourceLink
    />
  );
};

export default SingleQuestion;
