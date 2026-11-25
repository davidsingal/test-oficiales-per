"use client";

import { useProgress } from "@/lib/progress-store";

/** Questions in a topic, plus how many the learner has practised and got right. */
const TopicStats = ({ topicName, total }: { topicName: string; total: number }) => {
  const progress = useProgress();
  const records = Object.values(progress.questions).filter(
    (record) => record.topicName === topicName,
  );
  const correct = records.filter((record) => record.outcome === "correct").length;

  return (
    <span className="block text-sm text-muted-foreground">
      {total} {total === 1 ? "pregunta" : "preguntas"}
      {records.length > 0 &&
        ` · ${records.length} practicadas · ${Math.round((correct / records.length) * 100)}% de aciertos`}
    </span>
  );
};

export default TopicStats;
