import type { CollectionConfig } from "payload";

export const Answers: CollectionConfig = {
  slug: "answers",
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "question",
          label: "Pregunta relacionada",
          type: "relationship",
          relationTo: "questions",
          hasMany: false,
          required: true,
        },
        {
          name: "answerId",
          label: "Identificador de respuesta",
          type: "select",
          options: [
            { label: "A", value: "A" },
            { label: "B", value: "B" },
            { label: "C", value: "C" },
            { label: "D", value: "D" },
          ],
          required: true,
          defaultValue: "A",
        },
      ],
    },
    {
      name: "answerText",
      label: "Texto de la respuesta",
      type: "text",
      required: true,
    },
  ],
};

export default Answers;
