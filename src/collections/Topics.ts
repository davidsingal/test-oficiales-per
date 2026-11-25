import type { CollectionConfig } from "payload";

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
