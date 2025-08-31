import { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  Shield,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Member, Branch, Department } from "../shared/types";
import { UserRole } from "@/hooks/useRolePermissions";
import { MemberRemovalModal } from "./MemberRemovalModal";
import { supabase } from "@/lib/supabase";
import { useMemberOperations } from "../shared/useMemberOperations";

interface DeactivatedMember {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "manager" | "employee";
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  is_active: boolean;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: "admin" | "manager" | "employee";
  organization_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  name?: string;
}

interface InvitationStats {
  total: number;
  pending: number;
  accepted: number;
  acceptance_rate: number;
}

interface MemberManagementProps {
  members: Member[];
  branches: Branch[];
  departments: Department[];
  onUpdateMemberRole: (memberId: string, newRole: string) => void;
  onUpdateMemberBranch: (memberId: string, branchId: string | null) => void;
  onUpdateMemberDepartments: (
    memberId: string,
    departmentIds: string[] | null
  ) => void;
  onDeactivateMember: (memberId: string) => void;
  onPermanentDeleteMember: (memberId: string) => void;
  onReactivateMember?: (memberId: string) => void;
  onInviteMember: () => void;
  showInviteModal: boolean;
  setShowInviteModal: (show: boolean) => void;
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  inviteRole: string;
  setInviteRole: (role: string) => void;
  inviteBranchId: string;
  setInviteBranchId: (branchId: string) => void;
  inviteDepartmentIds: string[];
  setInviteDepartmentIds: (departmentIds: string[]) => void;
  inviting: boolean;
  onSubmitInvite: () => void;
  // Role permissions
  currentUserRole: UserRole | null;
  currentUserId?: string;
  canInviteMembers: boolean;
  canEditOtherMembers: boolean;
  canDeleteMembers: boolean;
  canAssignMembersInDepartment: boolean;
  userAssignedBranchId: string | null;
  userAssignedDepartmentIds: string[] | null;
  processing?: boolean;
  showWarning?: (
    title: string,
    message?: string,
    action?: { label: string; onClick: () => void }
  ) => void;
  // Invitation management props
  organizationId: string;
  organizationName: string;
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
}

export const MemberManagement = ({
  members,
  branches,
  departments,
  onUpdateMemberRole,
  onUpdateMemberBranch,
  onUpdateMemberDepartments,
  onDeactivateMember,
  onPermanentDeleteMember,
  onReactivateMember,
  onInviteMember,
  showInviteModal,
  setShowInviteModal,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  inviteBranchId,
  setInviteBranchId,
  inviteDepartmentIds,
  setInviteDepartmentIds,
  inviting,
  onSubmitInvite,
  // Role permissions
  currentUserRole,
  currentUserId,
  canInviteMembers,
  canEditOtherMembers,
  canDeleteMembers,
  canAssignMembersInDepartment,
  userAssignedBranchId,
  userAssignedDepartmentIds,
  processing = false,
  showWarning,
  // Invitation management props
  organizationId,
  organizationName,
  showSuccess,
  showError,
  showInfo,
}: MemberManagementProps) => {
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [deactivatedMembers, setDeactivatedMembers] = useState<
    DeactivatedMember[]
  >([]);
  const [loadingDeactivated, setLoadingDeactivated] = useState(true);
  const [showDeactivatedSection, setShowDeactivatedSection] = useState(false);

  // Invitation management state
  const [pendingInvitations, setPendingInvitations] = useState<
    PendingInvitation[]
  >([]);
  const [invitationStats, setInvitationStats] = useState<InvitationStats>({
    total: 0,
    pending: 0,
    accepted: 0,
    acceptance_rate: 0,
  });
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [refreshingInvitations, setRefreshingInvitations] = useState(false);
  const [resendingInvitations, setResendingInvitations] = useState<
    Record<string, boolean>
  >({});
  const [deletingInvitations, setDeletingInvitations] = useState<
    Record<string, boolean>
  >({});
  const [showInvitationsSection, setShowInvitationsSection] = useState(false);

  const { resendInvitation } = useMemberOperations();

  // Only allow admins to access invitation management
  const canManageInvitations = currentUserRole === "admin";

  // Fetch deactivated members
  const fetchDeactivatedMembers = async () => {
    if (!currentUserRole) return;

    try {
      setLoadingDeactivated(true);
      const { data, error } = await supabase
        .from("members")
        .select(
          `
          id,
          email,
          name,
          role,
          created_at,
          updated_at,
          avatar_url,
          is_active
        `
        )
        .eq("is_active", false)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setDeactivatedMembers(data || []);
    } catch (error) {
      console.error("Error fetching deactivated members:", error);
    } finally {
      setLoadingDeactivated(false);
    }
  };

  // Load deactivated members when component mounts or when showDeactivatedSection changes
  useEffect(() => {
    if (showDeactivatedSection) {
      fetchDeactivatedMembers();
    }
  }, [showDeactivatedSection, currentUserRole]);

  // Realtime subscription for deactivated members
  useEffect(() => {
    if (!showDeactivatedSection || !currentUserRole) return;

    const channel = supabase
      .channel("deactivated-members-realtime")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "members",
          filter: "is_active=eq.false",
        },
        (payload) => {
          console.log("Deactivated members table change detected:", payload);

          if (payload.eventType === "INSERT") {
            // New deactivated member
            const newMember = payload.new as DeactivatedMember;
            setDeactivatedMembers((prev) => [newMember, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const updatedMember = payload.new as DeactivatedMember;

            if (updatedMember.is_active) {
              // Member was reactivated, remove from deactivated list
              setDeactivatedMembers((prev) =>
                prev.filter((member) => member.id !== updatedMember.id)
              );
            } else {
              // Member info was updated while still deactivated
              setDeactivatedMembers((prev) =>
                prev.map((member) =>
                  member.id === updatedMember.id ? updatedMember : member
                )
              );
            }
          } else if (payload.eventType === "DELETE") {
            // Member was permanently deleted
            setDeactivatedMembers((prev) =>
              prev.filter((member) => member.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [showDeactivatedSection, currentUserRole]);

  // Reactivate member handler
  const handleReactivate = async (memberId: string) => {
    if (onReactivateMember) {
      await onReactivateMember(memberId);
      // Refresh deactivated members list
      fetchDeactivatedMembers();
    }
  };

  // Permanent delete from deactivated list
  const handlePermanentDeleteFromDeactivated = async (memberId: string) => {
    const member = deactivatedMembers.find((m) => m.id === memberId);
    if (!member) return;

    if (showWarning) {
      showWarning(
        `Permanently Delete ${member.name || member.email}?`,
        `This action cannot be undone, but will allow them to be re-invited.`,
        {
          label: "Delete Forever",
          onClick: async () => {
            await onPermanentDeleteMember(memberId);
            // Refresh deactivated members list
            fetchDeactivatedMembers();
          },
        }
      );
    } else {
      // Fallback to browser confirm if toast is not available
      if (
        confirm(
          `Are you sure you want to permanently delete ${
            member.name || member.email
          }? ` +
            `This action cannot be undone, but will allow them to be re-invited.`
        )
      ) {
        await onPermanentDeleteMember(memberId);
        // Refresh deactivated members list
        fetchDeactivatedMembers();
      }
    }
  };

  // Invitation management functions
  const fetchInvitationData = async () => {
    try {
      setLoadingInvitations(true);

      // Fetch pending invitations (members who haven't activated their accounts)
      const { data: pendingData, error: pendingError } = await supabase
        .from("members")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", false)
        .order("created_at", { ascending: false });

      if (pendingError) throw pendingError;

      setPendingInvitations(pendingData || []);

      // Fetch stats for all members
      const { data: allMembersData, error: allMembersError } = await supabase
        .from("members")
        .select("is_active")
        .eq("organization_id", organizationId);

      if (allMembersError) throw allMembersError;

      const total = allMembersData?.length || 0;
      const pending = (pendingData || []).length;
      const accepted = total - pending;
      const acceptance_rate = total > 0 ? (accepted / total) * 100 : 0;

      setInvitationStats({
        total,
        pending,
        accepted,
        acceptance_rate,
      });
    } catch (error) {
      console.error("Error fetching invitation data:", error);
      showError("Error", "Failed to load invitation data");
    } finally {
      setLoadingInvitations(false);
    }
  };

  const refreshInvitationData = async () => {
    setRefreshingInvitations(true);
    await fetchInvitationData();
    setRefreshingInvitations(false);
  };

  const handleResendInvitation = async (
    invitationId: string,
    email: string
  ) => {
    setResendingInvitations((prev) => ({ ...prev, [invitationId]: true }));

    try {
      const invitation = pendingInvitations.find(
        (inv) => inv.id === invitationId
      );
      if (!invitation) throw new Error("Invitation not found");

      await resendInvitation(
        invitation.email,
        invitation.role,
        organizationId,
        organizationName,
        showSuccess,
        showError
      );
    } catch (error) {
      console.error("Error resending invitation:", error);
      showError("Error", "Failed to resend invitation");
    } finally {
      setResendingInvitations((prev) => ({ ...prev, [invitationId]: false }));
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    const invitation = pendingInvitations.find(
      (inv) => inv.id === invitationId
    );
    if (!invitation) return;

    if (
      confirm(
        `Are you sure you want to delete the invitation for ${invitation.email}?`
      )
    ) {
      setDeletingInvitations((prev) => ({ ...prev, [invitationId]: true }));

      try {
        const { error } = await supabase
          .from("members")
          .delete()
          .eq("id", invitationId);

        if (error) throw error;

        setPendingInvitations((prev) =>
          prev.filter((inv) => inv.id !== invitationId)
        );
        showSuccess("Invitation Deleted", "Invitation has been deleted");

        // Refresh stats
        await fetchInvitationData();
      } catch (error) {
        console.error("Error deleting invitation:", error);
        showError("Error", "Failed to delete invitation");
      } finally {
        setDeletingInvitations((prev) => ({ ...prev, [invitationId]: false }));
      }
    }
  };

  // Load invitation data when component mounts or when showInvitationsSection changes
  useEffect(() => {
    if (showInvitationsSection && canManageInvitations) {
      fetchInvitationData();
    }
  }, [showInvitationsSection, canManageInvitations, organizationId]);

  // Get member avatar URL from Supabase storage or fallback to initials
  const getAvatarDisplay = (member: Member) => {
    if (member.avatar_url) {
      return {
        type: "image",
        src: member.avatar_url,
        alt: member.name || member.email,
      };
    }

    return {
      type: "initials",
      initials:
        member.name?.charAt(0)?.toUpperCase() ||
        member.email?.charAt(0)?.toUpperCase() ||
        "?",
      gradient:
        member.role === "admin"
          ? "from-purple-500 to-indigo-600"
          : member.role === "manager"
          ? "from-blue-500 to-cyan-600"
          : "from-green-500 to-teal-600",
    };
  };
  // Helper functions to determine permissions
  const canEditMember = (member: Member): boolean => {
    // User cannot edit themselves
    if (member.id === currentUserId) return false;

    // Admin can edit everyone except themselves
    if (currentUserRole === "admin") return true;

    // Managers can assign departments to employees in their assigned departments
    if (currentUserRole === "manager" && member.role === "employee") {
      return canAssignMembersInDepartment;
    }

    return false;
  };

  const canDeleteMember = (member: Member): boolean => {
    // User cannot delete themselves
    if (member.id === currentUserId) return false;

    // Admin cannot remove another admin (prevent removing the last admin)
    if (member.role === "admin" && currentUserRole === "admin") return false;

    // Only admin can delete members
    return currentUserRole === "admin" && canDeleteMembers;
  };

  const canEditMemberRole = (member: Member): boolean => {
    // User cannot edit their own role
    if (member.id === currentUserId) return false;

    // Only admin can edit roles
    return currentUserRole === "admin" && canEditOtherMembers;
  };

  const canAssignMemberBranch = (member: Member): boolean => {
    // Admins should not be assigned to branches
    if (member.role === "admin") return false;

    // Only admin can assign branches to non-admin members
    return currentUserRole === "admin" && canEditOtherMembers;
  };

  const canAssignMemberDepartment = (member: Member): boolean => {
    // Admins should not be assigned to departments
    if (member.role === "admin") return false;

    // Admin can assign any department to non-admin members
    if (currentUserRole === "admin" && canEditOtherMembers) return true;

    // Manager can assign departments in their branch to employees
    if (currentUserRole === "manager" && member.role === "employee") {
      return canAssignMembersInDepartment;
    }

    return false;
  };

  const getAvailableDepartments = (member: Member): Department[] => {
    if (currentUserRole === "admin") {
      // Admin can assign any department in the member's branch
      return departments.filter((dept) => dept.branch_id === member.branch_id);
    } else if (currentUserRole === "manager") {
      // Manager can only assign departments they have access to
      return departments.filter(
        (dept) =>
          dept.branch_id === member.branch_id &&
          userAssignedDepartmentIds?.includes(dept.id)
      );
    }
    return [];
  };

  return (
    <>
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">
              Organization Members ({members.length})
            </h2>
          </div>
          {canInviteMembers && (
            <button onClick={onInviteMember} className="btn-primary">
              <Users className="w-4 h-4 mr-2" />
              Invite Member
            </button>
          )}
        </div>
        <p className="text-gray-600 mb-6">
          {currentUserRole === "admin"
            ? "Manage member roles, assignments to branches and departments"
            : "View members and assign departments within your branch"}
        </p>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav
            className="-mb-px flex space-x-8"
            aria-label="Member Management Tabs"
          >
            <button
              onClick={() => {
                setShowDeactivatedSection(false);
                setShowInvitationsSection(false);
              }}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                !showDeactivatedSection && !showInvitationsSection
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Active Members ({members.length})
            </button>

            {canManageInvitations && (
              <button
                onClick={() => {
                  setShowDeactivatedSection(false);
                  setShowInvitationsSection(true);
                }}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  showInvitationsSection
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Pending Invitations ({pendingInvitations.length})
              </button>
            )}

            {currentUserRole === "admin" && (
              <button
                onClick={() => {
                  setShowInvitationsSection(false);
                  setShowDeactivatedSection(true);
                }}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  showDeactivatedSection
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Deactivated ({deactivatedMembers.length})
              </button>
            )}
          </nav>
        </div>

        {/* Active Members Table */}
        {!showDeactivatedSection && !showInvitationsSection && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Member
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Branch Assignment
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Department Assignment
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Joined
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          {(() => {
                            const avatar = getAvatarDisplay(member);

                            if (avatar.type === "image") {
                              return (
                                <img
                                  src={avatar.src}
                                  alt={avatar.alt}
                                  className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                                  onError={(e) => {
                                    // Fallback to initials if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    const fallback =
                                      target.nextElementSibling as HTMLElement;
                                    if (fallback) {
                                      fallback.classList.remove("hidden");
                                    }
                                  }}
                                />
                              );
                            }

                            return null;
                          })()}

                          {(() => {
                            const avatar = getAvatarDisplay(member);

                            return (
                              <div
                                className={`w-8 h-8 bg-gradient-to-br ${
                                  avatar.gradient || "from-gray-500 to-gray-600"
                                } rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm ${
                                  avatar.type === "image" ? "hidden" : ""
                                }`}
                              >
                                {avatar.type === "initials"
                                  ? avatar.initials
                                  : "?"}
                              </div>
                            );
                          })()}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">
                              {member.name || "Unknown"}
                            </p>
                            {!member.is_active && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {canEditMemberRole(member) ? (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            onUpdateMemberRole(member.id, e.target.value)
                          }
                          className="input-field text-sm"
                          aria-label="Member role"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="employee">Employee</option>
                        </select>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {member.role}
                          {member.id === currentUserId && (
                            <span className="ml-1 text-gray-500">(You)</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {canAssignMemberBranch(member) ? (
                        <select
                          value={member.branch_id || ""}
                          onChange={(e) =>
                            onUpdateMemberBranch(
                              member.id,
                              e.target.value || null
                            )
                          }
                          className="input-field text-sm"
                          aria-label="Branch assignment"
                        >
                          <option value="">No Branch</option>
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-600">
                          {member.branch_id
                            ? branches.find((b) => b.id === member.branch_id)
                                ?.name || "Unknown"
                            : "No Branch"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {canAssignMemberDepartment(member) ? (
                        <select
                          value={member.department_ids?.[0] || ""}
                          onChange={(e) =>
                            onUpdateMemberDepartments(
                              member.id,
                              e.target.value ? [e.target.value] : null
                            )
                          }
                          className="input-field text-sm"
                          aria-label="Department assignment"
                          disabled={!member.branch_id}
                        >
                          <option value="">No Department</option>
                          {member.branch_id &&
                            getAvailableDepartments(member).map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.name}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-600">
                          {member.department_ids &&
                          member.department_ids.length > 0
                            ? departments.find(
                                (d) => d.id === member.department_ids?.[0]
                              )?.name || "Unknown"
                            : "No Department"}
                        </span>
                      )}
                      {!member.branch_id &&
                        canAssignMemberDepartment(member) && (
                          <p className="text-xs text-gray-400 mt-1">
                            Assign to branch first
                          </p>
                        )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {new Date(member.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        {canDeleteMember(member) ? (
                          <button
                            onClick={() => {
                              setMemberToRemove(member);
                              setShowRemovalModal(true);
                            }}
                            className="text-sm text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                            title="Remove member from organization"
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">
                            {member.id === currentUserId
                              ? "You"
                              : member.role === "admin"
                              ? "Protected"
                              : "View Only"}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pending Invitations Section */}
        {showInvitationsSection && canManageInvitations && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">
                      Total Members
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {invitationStats.total}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">
                      Pending
                    </p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {invitationStats.pending}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">
                      Accepted
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {invitationStats.accepted}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">
                      Acceptance Rate
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      {invitationStats.acceptance_rate.toFixed(0)}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Pending Invitations ({pendingInvitations.length})
              </h3>
              <button
                onClick={refreshInvitationData}
                disabled={refreshingInvitations}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshingInvitations ? "animate-spin" : ""
                  }`}
                />
                <span>Refresh</span>
              </button>
            </div>

            {/* Invitations Table */}
            {loadingInvitations ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : pendingInvitations.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Pending Invitations
                </h3>
                <p className="text-gray-500">
                  All sent invitations have been accepted or there are no
                  pending invitations.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Role
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Invited
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInvitations.map((invitation) => (
                      <tr
                        key={invitation.id}
                        className="border-b border-gray-100"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <Mail className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {invitation.email}
                              </p>
                              {invitation.name && (
                                <p className="text-sm text-gray-500">
                                  {invitation.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              invitation.role === "admin"
                                ? "bg-red-100 text-red-800"
                                : invitation.role === "manager"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {invitation.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-500">
                            {new Date(
                              invitation.created_at
                            ).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() =>
                                handleResendInvitation(
                                  invitation.id,
                                  invitation.email
                                )
                              }
                              disabled={resendingInvitations[invitation.id]}
                              className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50"
                            >
                              <Send className="w-3 h-3 mr-1" />
                              {resendingInvitations[invitation.id]
                                ? "Sending..."
                                : "Resend"}
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteInvitation(invitation.id)
                              }
                              disabled={deletingInvitations[invitation.id]}
                              className="flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              {deletingInvitations[invitation.id]
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Deactivated Members Section */}
        {showDeactivatedSection && currentUserRole === "admin" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Deactivated Members ({deactivatedMembers.length})
              </h3>
              <p className="text-sm text-gray-500">
                Members who have been deactivated but can be reactivated or
                permanently deleted
              </p>
            </div>

            {loadingDeactivated ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">
                  Loading deactivated members...
                </span>
              </div>
            ) : deactivatedMembers.length === 0 ? (
              <div className="text-center py-8">
                <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No deactivated members found.</p>
                <p className="text-sm text-gray-400 mt-1">
                  All members are currently active.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Member
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Role
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Deactivated
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deactivatedMembers.map((member) => (
                      <tr key={member.id} className="border-b border-gray-100">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8">
                              {member.avatar_url ? (
                                <img
                                  src={member.avatar_url}
                                  alt={member.name || member.email}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-sm font-medium">
                                  {(
                                    member.name?.charAt(0) ||
                                    member.email?.charAt(0) ||
                                    "?"
                                  ).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {member.name || member.email}
                              </p>
                              {member.name && (
                                <p className="text-sm text-gray-500">
                                  {member.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              member.role === "admin"
                                ? "bg-red-100 text-red-800"
                                : member.role === "manager"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {member.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-500">
                            {new Date(member.updated_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            {onReactivateMember && (
                              <button
                                onClick={() => handleReactivate(member.id)}
                                disabled={processing}
                                className="flex items-center px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md border border-green-200 hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:opacity-50"
                              >
                                <UserCheck className="w-3 h-3 mr-1" />
                                Reactivate
                              </button>
                            )}
                            <button
                              onClick={() =>
                                handlePermanentDeleteFromDeactivated(member.id)
                              }
                              disabled={processing}
                              className="flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete Forever
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="analytics-card p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Invite New Member</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-field"
                  placeholder="Enter email address"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="input-field"
                  aria-label="Select role for new member"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch <span className="text-red-500">*</span>
                </label>
                <select
                  value={inviteBranchId}
                  onChange={(e) => setInviteBranchId(e.target.value)}
                  className="input-field"
                  aria-label="Select branch for new member"
                  required
                >
                  <option value="">Select a branch...</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              {inviteRole === "employee" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departments <span className="text-red-500">*</span>
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
                    {departments.length > 0 ? (
                      departments.map((department) => (
                        <label
                          key={department.id}
                          className="flex items-center space-x-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={inviteDepartmentIds.includes(
                              department.id
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setInviteDepartmentIds([
                                  ...inviteDepartmentIds,
                                  department.id,
                                ]);
                              } else {
                                setInviteDepartmentIds(
                                  inviteDepartmentIds.filter(
                                    (id) => id !== department.id
                                  )
                                );
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {department.name}
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 py-2">
                        No departments available
                      </p>
                    )}
                  </div>
                  {inviteDepartmentIds.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {inviteDepartmentIds.length} department(s) selected
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail("");
                  setInviteRole("employee");
                  setInviteBranchId("");
                  setInviteDepartmentIds([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={inviting}
              >
                Cancel
              </button>
              <button
                onClick={onSubmitInvite}
                disabled={
                  inviting ||
                  !inviteEmail.trim() ||
                  !inviteBranchId ||
                  (inviteRole === "employee" &&
                    inviteDepartmentIds.length === 0)
                }
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {inviting ? "Sending..." : "Send Invitation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Removal Modal */}
      <MemberRemovalModal
        member={memberToRemove}
        isOpen={showRemovalModal}
        onClose={() => {
          setShowRemovalModal(false);
          setMemberToRemove(null);
        }}
        onDeactivate={onDeactivateMember}
        onPermanentDelete={onPermanentDeleteMember}
        processing={processing}
        showWarning={showWarning}
      />
    </>
  );
};
