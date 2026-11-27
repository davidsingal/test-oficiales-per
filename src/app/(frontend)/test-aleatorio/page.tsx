import RandomTest, { randomTestMetadata } from "@/views/random-test";
import { PER } from "@/lib/licences";

export const dynamic = "force-dynamic";

export const metadata = randomTestMetadata(PER);

const Page = () => <RandomTest licence={PER} />;

export default Page;
