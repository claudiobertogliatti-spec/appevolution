import { PartnerFilesPage } from "./PartnerFilesPage";

export function MaterialiPage({ partnerId }) {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <PartnerFilesPage partner={{ id: partnerId }} />
      </div>
    </div>
  );
}

export default MaterialiPage;
