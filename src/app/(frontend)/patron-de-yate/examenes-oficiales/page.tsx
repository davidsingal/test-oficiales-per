import OfficialExams, { officialExamsMetadata } from "@/views/official-exams";
import { PY } from "@/lib/licences";

export const dynamic = "force-dynamic";

export const metadata = officialExamsMetadata(PY);

const Page = () => <OfficialExams licence={PY} />;

export default Page;
