import { PartnerFilesPage } from "./PartnerFilesPage";

export function MaterialiPage({ partnerId }) {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <PartnerFilesPage partner={{ id: partnerId }} />
      </div>
    </div>
  );
}

export default MaterialiPage;
