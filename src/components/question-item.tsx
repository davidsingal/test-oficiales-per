import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FC } from "react";
import type { Question } from "@/types/payload-types";

const QuestionItem: FC<{ data: Question }> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.questionText}</CardTitle>
      </CardHeader>
      <CardContent>
        <p></p>
      </CardContent>
    </Card>
  );
};

export default QuestionItem;
