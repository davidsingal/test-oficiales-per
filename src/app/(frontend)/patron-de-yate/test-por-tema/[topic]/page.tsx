import Topic, { topicMetadata, type TopicParams } from "@/views/topic";
import { PY } from "@/lib/licences";

export const dynamic = "force-dynamic";

type PageProps = { params: TopicParams };

export const generateMetadata = ({ params }: PageProps) => topicMetadata(PY, params);

const Page = ({ params }: PageProps) => <Topic licence={PY} params={params} />;

export default Page;
