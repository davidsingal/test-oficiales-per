import RandomTest, { randomTestMetadata } from "@/views/random-test";
import { PY } from "@/lib/licences";

export const dynamic = "force-dynamic";

export const metadata = randomTestMetadata(PY);

const Page = () => <RandomTest licence={PY} />;

export default Page;
