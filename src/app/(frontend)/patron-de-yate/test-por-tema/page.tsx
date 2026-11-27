import Topics, { topicsMetadata } from "@/views/topics";
import { PY } from "@/lib/licences";

export const dynamic = "force-dynamic";

export const metadata = topicsMetadata(PY);

const Page = () => <Topics licence={PY} />;

export default Page;
