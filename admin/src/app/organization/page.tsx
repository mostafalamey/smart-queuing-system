"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { getAllowedOrganizationTabs } from "@/lib/roleUtils";
import { RoleRestrictedAccess } from "@/components/RoleRestrictedAccess";
import { useAppToast } from "@/hooks/useAppToast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PlanLimitsDashboard } from "@/components/PlanLimitsDashboard";
import { QRCodeData } from "./features/shared/types";
import { useOrganizationData } from "./features/shared/useOrganizationData";
import { useOrganizationOperations } from "./features/shared/useOrganizationOperations";
import { useMemberOperations } from "./features/shared/useMemberOperations";
import { OrganizationHeader } from "./features/organization-header/OrganizationHeader";
import { OrganizationDetails } from "./features/organization-details/OrganizationDetails";
import { QRManagement } from "./features/qr-management/QRManagement";
import { MemberManagement } from "./features/member-management/MemberManagement";
import { logger } from "@/lib/logger";

// Force dynamic rendering for client-side features
export const dynamic = "force-dynamic";

export default function OrganizationPage() {
  const { userProfile, user, loading: authLoading } = useAuth();
  const rolePermissions = useRolePermissions();
  const { userRole, canAccessOrganization } = rolePermissions;
  const router = useRouter();
  const { showSuccess, showError, showInfo, showWarning } = useAppToast();

  // Tab state - use stable default, update later with useEffect
  const [activeTab, setActiveTab] = useState<
    "details" | "qr" | "members" | "plan"
  >("qr");

  // Member invitation state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<
    "admin" | "manager" | "employee"
  >("employee");
  const [inviting, setInviting] = useState(false);

  // Data hooks - MUST be called unconditionally
  const {
    organization,
    branches,
    departments,
    members,
    loading,
    orgForm,
    setOrgForm,
    uploading,
    setUploading,
    setOrganization,
    setMembers,
    fetchOrganization,
    setLoading,
    qrCodeUrl,
    branchQrCodes,
    setBranchQrCodes,
    departmentQrCodes,
    setDepartmentQrCodes,
    qrGenerating,
    generateQRCode,
    // QR Code Action Functions
    downloadQR,
    copyQRUrl,
    printQR,
    downloadBranchQR,
    copyBranchQRUrl,
    printBranchQR,
    downloadDepartmentQR,
    copyDepartmentQRUrl,
    printDepartmentQR,
  } = useOrganizationData();

  // Operation hooks - MUST be called unconditionally
  const { updateOrganization, uploadLogo, handleLogoUpload, removeLogo } =
    useOrganizationOperations();

  // Member operations hook - MUST be called unconditionally
  const {
    updateMemberRole,
    updateMemberBranch,
    updateMemberDepartments,
    removeMember,
    inviteMember,
    resendInvitation,
    bulkInviteMembers,
    isUpdatingRole,
    isRemovingMember,
  } = useMemberOperations();

  // Redirect non-admin/non-manager users to dashboard
  useEffect(() => {
    if (!authLoading && userRole && !canAccessOrganization) {
      router.replace("/dashboard");
    }
  }, [authLoading, userRole, canAccessOrganization, router]);

  // Update active tab based on user role when role is available
  useEffect(() => {
    if (userRole) {
      const allowedTabs = getAllowedOrganizationTabs(userRole);
      // Only change tab if current tab is not allowed
      if (!allowedTabs.includes(activeTab)) {
        const firstAllowedTab =
          (allowedTabs[0] as "details" | "qr" | "members" | "plan") || "qr";
        setActiveTab(firstAllowedTab);
      }
    }
  }, [userRole, activeTab]);

  // Show loading or redirect if no access
  if (authLoading || !canAccessOrganization) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-celestial-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Handlers
  const handleUpdateOrganization = async (e: React.FormEvent) => {
    await updateOrganization(
      e,
      userProfile,
      orgForm,
      fetchOrganization,
      setLoading,
      showSuccess,
      showError
    );
  };

  const handleLogoUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadLogoWithParams = (file: File) =>
      uploadLogo(
        file,
        userProfile,
        setUploading,
        setOrgForm,
        fetchOrganization,
        showSuccess,
        showError,
        showWarning
      );

    handleLogoUpload(e, uploadLogoWithParams, showWarning);
  };

  const handleRemoveLogo = async () => {
    await removeLogo(
      userProfile,
      orgForm,
      setUploading,
      setOrgForm,
      fetchOrganization,
      showSuccess,
      showError
    );
  };

  // Member management handlers
  const handleInviteMember = () => {
    setShowInviteModal(true);
  };

  const handleSubmitInvite = async () => {
    if (
      !inviteEmail.trim() ||
      !userProfile?.organization_id ||
      !organization?.name
    ) {
      showError("Invalid Data", "Missing required information for invitation");
      return;
    }

    await inviteMember(
      inviteEmail.trim(),
      inviteRole,
      userProfile.organization_id,
      organization.name,
      setInviting,
      showSuccess,
      showError,
      () => {
        setShowInviteModal(false);
        setInviteEmail("");
        setInviteRole("employee");
        // Don't refresh the page immediately - let user see the success message
        // The members list will be updated on next page load
      }
    );
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    // Validate role
    if (!["admin", "manager", "employee"].includes(newRole)) {
      showError("Invalid Role", "The selected role is not valid");
      return;
    }

    await updateMemberRole(
      memberId,
      newRole as "admin" | "manager" | "employee",
      setMembers,
      showSuccess,
      showError
    );
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    await removeMember(
      memberId,
      member.name || member.email,
      setMembers,
      showSuccess,
      showError
    );
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Loading organization details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!userProfile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-gray-600">
              Please log in to view organization details.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!organization) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-gray-600">
              No organization found. Please contact support.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 max-h-screen overflow-y-auto">
        {/* Header */}
        <OrganizationHeader organization={organization} />

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mt-4 mb-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {(() => {
              const allowedTabs = userRole
                ? getAllowedOrganizationTabs(userRole)
                : ["qr"]; // Default to QR if role not loaded

              return (
                <>
                  {allowedTabs.includes("details") && (
                    <button
                      onClick={() => setActiveTab("details")}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "details"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Organization Details
                    </button>
                  )}
                  {allowedTabs.includes("plan") && (
                    <button
                      onClick={() => setActiveTab("plan")}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "plan"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Plan & Billing
                    </button>
                  )}
                  {allowedTabs.includes("qr") && (
                    <button
                      onClick={() => setActiveTab("qr")}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "qr"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      QR Code Management
                    </button>
                  )}
                  {allowedTabs.includes("members") && (
                    <button
                      onClick={() => setActiveTab("members")}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "members"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Member Management
                    </button>
                  )}
                </>
              );
            })()}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="pb-4">
          {activeTab === "details" && (
            <OrganizationDetails
              orgForm={orgForm}
              setOrgForm={setOrgForm}
              loading={loading}
              uploading={uploading}
              onSubmit={handleUpdateOrganization}
              onLogoUpload={handleLogoUploadFile}
              onRemoveLogo={handleRemoveLogo}
              readOnly={!rolePermissions.canEditOrganization}
            />
          )}

          {activeTab === "plan" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Subscription Plan & Usage
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Monitor your current plan usage and upgrade when needed to
                  unlock more features.
                </p>
              </div>
              <PlanLimitsDashboard />
            </div>
          )}

          {activeTab === "qr" && (
            <QRManagement
              organization={organization}
              userProfile={userProfile}
              branches={branches}
              departments={departments}
              qrCodeUrl={qrCodeUrl}
              branchQrCodes={branchQrCodes}
              departmentQrCodes={departmentQrCodes}
              qrGenerating={qrGenerating}
              onGenerateQR={generateQRCode}
              onDownloadQR={downloadQR}
              onCopyQRUrl={copyQRUrl}
              onPrintQR={printQR}
              onDownloadBranchQR={downloadBranchQR}
              onCopyBranchQRUrl={copyBranchQRUrl}
              onPrintBranchQR={printBranchQR}
              onRefreshBranchQR={() => {}}
              onDownloadDepartmentQR={downloadDepartmentQR}
              onCopyDepartmentQRUrl={copyDepartmentQRUrl}
              onPrintDepartmentQR={printDepartmentQR}
              onRefreshDepartmentQR={() => {}}
            />
          )}

          {activeTab === "members" && (
            <MemberManagement
              members={members}
              branches={branches}
              departments={departments}
              onUpdateMemberRole={handleUpdateMemberRole}
              onUpdateMemberBranch={async (
                memberId: string,
                branchId: string | null
              ) => {
                await updateMemberBranch(
                  memberId,
                  branchId,
                  setMembers,
                  showSuccess,
                  showError
                );
              }}
              onUpdateMemberDepartments={async (
                memberId: string,
                departmentIds: string[] | null
              ) => {
                await updateMemberDepartments(
                  memberId,
                  departmentIds,
                  setMembers,
                  showSuccess,
                  showError
                );
              }}
              onRemoveMember={handleRemoveMember}
              onInviteMember={handleInviteMember}
              showInviteModal={showInviteModal}
              setShowInviteModal={setShowInviteModal}
              inviteEmail={inviteEmail}
              setInviteEmail={setInviteEmail}
              inviteRole={inviteRole}
              setInviteRole={(role: string) => {
                if (["admin", "manager", "employee"].includes(role)) {
                  setInviteRole(role as "admin" | "manager" | "employee");
                }
              }}
              inviting={inviting}
              onSubmitInvite={handleSubmitInvite}
              // Role permissions
              currentUserRole={userRole}
              currentUserId={user?.id}
              canInviteMembers={rolePermissions.canInviteMembers}
              canEditOtherMembers={rolePermissions.canEditOtherMembers}
              canDeleteMembers={rolePermissions.canDeleteMembers}
              canAssignMembersInDepartment={
                rolePermissions.canAssignMembersInDepartment
              }
              userAssignedBranchId={rolePermissions.assignedBranchId}
              userAssignedDepartmentIds={rolePermissions.assignedDepartmentIds}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
