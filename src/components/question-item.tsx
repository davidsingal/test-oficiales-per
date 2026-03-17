import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { FC } from "react";
import type { Answer, Question } from "@/types/payload-types";

const isAnswer = (answer: number | Answer): answer is Answer =>
  typeof answer === "object" && answer !== null;

const QuestionItem: FC<{ data: Question }> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {data.questionNumber}. {data.questionText}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup className="space-y-2">
          {data.answers?.filter(isAnswer).map((answer) => (
            <div className="flex items-center gap-2" key={answer.id}>
              <RadioGroupItem value={answer.answerId} id={answer.answerId} />
              <Label htmlFor={answer.answerId}>{answer.answerText}</Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default QuestionItem;
