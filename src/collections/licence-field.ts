import type { Field } from "payload";

/**
 * Which licence an exam question (or topic) belongs to. Topic names can repeat
 * across licences ("Meteorología" is in both), so topics carry it too.
 * Values match `LicenceId` in `@/lib/licences`.
 */
export const licenceField: Field = {
  name: "licence",
  label: "Titulación",
  type: "select",
  options: [
    { label: "Patrón de Embarcaciones de Recreo (PER)", value: "per" },
    { label: "Patrón de Yate (PY)", value: "py" },
  ],
  required: true,
  defaultValue: "per",
  index: true,
  admin: { position: "sidebar" },
};
