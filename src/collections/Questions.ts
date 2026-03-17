import type { CollectionConfig } from "payload";

export const Questions: CollectionConfig = {
  slug: "questions",
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "year",
          label: "Año del examen",
          type: "number",
          required: true,
          min: 2016,
          max: new Date().getFullYear(),
          defaultValue: new Date().getFullYear(),
        },
        {
          name: "month",
          label: "Mes del examen",
          type: "select",
          options: [
            { label: "Enero", value: "enero" },
            { label: "Febrero", value: "febrero" },
            { label: "Marzo", value: "marzo" },
            { label: "Abril", value: "abril" },
            { label: "Mayo", value: "mayo" },
            { label: "Junio", value: "junio" },
            { label: "Julio", value: "julio" },
            { label: "Agosto", value: "agosto" },
            { label: "Septiembre", value: "septiembre" },
            { label: "Octubre", value: "octubre" },
            { label: "Noviembre", value: "noviembre" },
            { label: "Diciembre", value: "diciembre" },
          ],
          required: true,
        },
        {
          name: "testNumber",
          label: "Número de test",
          type: "number",
          required: true,
        },
        {
          name: "questionNumber",
          label: "Número de pregunta dentro del test",
          type: "number",
          required: true,
          min: 1,
          max: 45,
          defaultValue: 1,
        },
      ],
    },
    {
      name: "topic",
      label: "Tema",
      type: "relationship",
      relationTo: "topics",
      hasMany: false,
      required: true,
    },

    {
      name: "questionText",
      label: "Texto de la pregunta",
      type: "text",
      required: true,
    },
    {
      name: "explanation",
      label: "Explicación de la respuesta",
      type: "textarea",
      required: false,
    },
    {
      name: "correctAnswer",
      label: "Respuesta correcta",
      type: "select",
      options: [
        { label: "A", value: "A" },
        { label: "B", value: "B" },
        { label: "C", value: "C" },
        { label: "D", value: "D" },
      ],
      required: false,
    },
  ],
};

export default Questions;
