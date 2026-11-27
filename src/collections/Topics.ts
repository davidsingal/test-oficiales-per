import type { CollectionConfig } from "payload";
import { licenceField } from "./licence-field";

export const Topics: CollectionConfig = {
  slug: "topics",
  // Exam content is public: anyone can read it (the site and the REST API),
  // only signed-in admins can change it.
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: "name",
  },
  fields: [
    licenceField,
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
