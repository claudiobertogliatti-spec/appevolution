import { PartnerFilesPage } from "./PartnerFilesPage";
import ProjectBookCard from "../rewards/ProjectBookCard";

export function MaterialiPage({ partnerId }) {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <ProjectBookCard partnerId={partnerId} compact />
        <div className="mt-6" />
        <PartnerFilesPage partner={{ id: partnerId }} />
      </div>
    </div>
  );
}

export default MaterialiPage;
