import type { CollectionConfig } from "payload";

export const Topics: CollectionConfig = {
  slug: "topics",
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "description",
      type: "textarea",
    },
  ],
};
