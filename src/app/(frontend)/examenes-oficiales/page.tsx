import OfficialExams, { officialExamsMetadata } from "@/views/official-exams";
import { PER } from "@/lib/licences";

export const dynamic = "force-dynamic";

export const metadata = officialExamsMetadata(PER);

const Page = () => <OfficialExams licence={PER} />;

export default Page;
