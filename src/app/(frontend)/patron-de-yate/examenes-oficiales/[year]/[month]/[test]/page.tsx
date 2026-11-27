import OfficialExam, {
  officialExamMetadata,
  type OfficialExamParams,
} from "@/views/official-exam";
import { PY } from "@/lib/licences";

type PageProps = { params: OfficialExamParams };

export const generateMetadata = ({ params }: PageProps) =>
  officialExamMetadata(PY, params);

const Page = ({ params }: PageProps) => <OfficialExam licence={PY} params={params} />;

export default Page;
