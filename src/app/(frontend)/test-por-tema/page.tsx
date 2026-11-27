import Topics, { topicsMetadata } from "@/views/topics";
import { PER } from "@/lib/licences";

export const dynamic = "force-dynamic";

export const metadata = topicsMetadata(PER);

const Page = () => <Topics licence={PER} />;

export default Page;
