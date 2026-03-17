import { getPayload } from "payload";
import config from "@payload-config";
import Link from "next/link";
import type { FC } from "react";

const payload = await getPayload({ config });

const TopicsList: FC = async () => {
  const topics = await payload.find({
    collection: "topics",
  });

  return (
    <section className="space-y-4 rounded-md border p-4">
      <h2 className="text-lg font-medium">Temas disponibles</h2>
      <ul className="space-y-2">
        {topics.docs
          ?.filter((d) => d.name !== "Carta de navegación") // Excluimos este tema por ahora
          .map((d) => (
            <li key={`topic-${d.id}`}>
              <Link
                href={`/test-por-tema/${encodeURIComponent(d.name)}`}
                passHref
                className="rounded-md border p-2 block hover:bg-gray-100 transition-colors"
              >
                {d.name}
              </Link>
            </li>
          ))}
      </ul>
    </section>
  );
};

export default TopicsList;
