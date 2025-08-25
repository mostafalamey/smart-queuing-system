import { Building2 } from "lucide-react";
import { Organization } from "../shared/types";

interface OrganizationHeaderProps {
  organization: Organization | null;
}

export const OrganizationHeader = ({
  organization,
}: OrganizationHeaderProps) => {
  return (
    <div className="page-header">
      <div className="header-accent"></div>

      <div className="header-content">
        <div className="header-icon-container">
          <div className="header-icon">
            <Building2 className="w-6 h-6 text-white" />
          </div>
        </div>
        <div>
          <h1 className="header-title">Organization Management</h1>
          <p className="header-subtitle">
            Configure settings for {organization?.name || "your organization"}
          </p>
        </div>
      </div>
    </div>
  );
};
