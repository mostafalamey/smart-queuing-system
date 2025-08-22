import { useState } from "react";
import { Users } from "lucide-react";
import { Member, Branch, Department } from "../shared/types";
import { UserRole } from "@/hooks/useRolePermissions";

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
  onRemoveMember: (memberId: string) => void;
  onInviteMember: () => void;
  showInviteModal: boolean;
  setShowInviteModal: (show: boolean) => void;
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  inviteRole: string;
  setInviteRole: (role: string) => void;
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
}

export const MemberManagement = ({
  members,
  branches,
  departments,
  onUpdateMemberRole,
  onUpdateMemberBranch,
  onUpdateMemberDepartments,
  onRemoveMember,
  onInviteMember,
  showInviteModal,
  setShowInviteModal,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
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
}: MemberManagementProps) => {
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
                        <p className="text-sm text-gray-500">{member.email}</p>
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
                    {!member.branch_id && canAssignMemberDepartment(member) && (
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
                          onClick={() => onRemoveMember(member.id)}
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
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
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
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail("");
                  setInviteRole("employee");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={inviting}
              >
                Cancel
              </button>
              <button
                onClick={onSubmitInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {inviting ? "Sending..." : "Send Invitation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
