import Topic, { topicMetadata, type TopicParams } from "@/views/topic";
import { PER } from "@/lib/licences";

export const dynamic = "force-dynamic";

type PageProps = { params: TopicParams };

export const generateMetadata = ({ params }: PageProps) => topicMetadata(PER, params);

const Page = ({ params }: PageProps) => <Topic licence={PER} params={params} />;

export default Page;
