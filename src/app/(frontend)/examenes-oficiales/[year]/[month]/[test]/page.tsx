import OfficialExam, {
  officialExamMetadata,
  type OfficialExamParams,
} from "@/views/official-exam";
import { PER } from "@/lib/licences";

type PageProps = { params: OfficialExamParams };

export const generateMetadata = ({ params }: PageProps) =>
  officialExamMetadata(PER, params);

const Page = ({ params }: PageProps) => <OfficialExam licence={PER} params={params} />;

export default Page;
