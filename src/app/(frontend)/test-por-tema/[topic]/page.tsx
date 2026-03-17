import { BackButton } from "@/components/back-button";

type PageProps = {
  params: Promise<{ topic: string }>;
};

export default async function TopicPage({ params }: PageProps) {
  const { topic: rawTopic } = await params;
  const selectedTopicName = decodeURIComponent(rawTopic);

  console.log("Selected topic:", selectedTopicName);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-4 rounded-md border p-4">
        <BackButton />
      </section>
    </main>
  );
}
