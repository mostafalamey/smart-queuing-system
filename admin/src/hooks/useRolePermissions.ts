import { useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";

export type UserRole = "admin" | "manager" | "employee";

export interface RolePermissions {
  // Navigation permissions
  canAccessDashboard: boolean;
  canAccessOrganization: boolean;
  canAccessAnalytics: boolean;
  canAccessTreeView: boolean;

  // Dashboard permissions
  canSelectBranch: boolean;
  canSelectDepartment: boolean;
  canResetQueue: boolean;
  canViewAllBranches: boolean;
  canViewAllDepartments: boolean;

  // Organization permissions
  canEditOrganization: boolean;
  canViewPlan: boolean;
  canInviteMembers: boolean;
  canEditMembers: boolean;
  canDeleteMembers: boolean;
  canRefreshQRCodes: boolean;
  canViewOrganizationDetails: boolean;
  canEditSelfRole: boolean;
  canEditOtherMembers: boolean;
  canAssignMembersInDepartment: boolean;

  // Tree view permissions
  canCreateBranch: boolean;
  canDeleteBranch: boolean;
  canEditBranch: boolean;
  canCreateDepartment: boolean;
  canDeleteDepartment: boolean;
  canEditDepartment: boolean;
  canCreateService: boolean;
  canDeleteService: boolean;
  canEditService: boolean;

  // Data access permissions
  assignedBranchId: string | null;
  assignedDepartmentIds: string[] | null;
  shouldAutoSelectBranch: boolean;
  shouldAutoSelectDepartment: boolean;
}

/**
 * Central hook for role-based permissions management
 * Returns permissions object based on current user's role and assignments
 * Note: Currently member assignments are handled through organization context
 */
export const useRolePermissions = (): RolePermissions & {
  userRole: UserRole | null;
  loading: boolean;
} => {
  const { userProfile, loading } = useAuth();

  const permissions = useMemo((): RolePermissions => {
    if (!userProfile?.role || !userProfile?.is_active) {
      // Default restrictive permissions for unauthenticated or inactive users
      return {
        canAccessDashboard: false,
        canAccessOrganization: false,
        canAccessAnalytics: false,
        canAccessTreeView: false,
        canSelectBranch: false,
        canSelectDepartment: false,
        canResetQueue: false,
        canViewAllBranches: false,
        canViewAllDepartments: false,
        canEditOrganization: false,
        canViewPlan: false,
        canInviteMembers: false,
        canEditMembers: false,
        canDeleteMembers: false,
        canRefreshQRCodes: false,
        canViewOrganizationDetails: false,
        canEditSelfRole: false,
        canEditOtherMembers: false,
        canAssignMembersInDepartment: false,
        canCreateBranch: false,
        canDeleteBranch: false,
        canEditBranch: false,
        canCreateDepartment: false,
        canDeleteDepartment: false,
        canEditDepartment: false,
        canCreateService: false,
        canDeleteService: false,
        canEditService: false,
        assignedBranchId: null,
        assignedDepartmentIds: null,
        shouldAutoSelectBranch: false,
        shouldAutoSelectDepartment: false,
      };
    }

    const role = userProfile.role;
    // Get actual branch and department assignments from database
    const branchId = userProfile.branch_id || null;
    // department_ids is now already parsed as an array from AuthContext
    const departmentIds: string[] | null = userProfile.department_ids || null;

    switch (role) {
      case "admin":
        return {
          // Admin has full access to everything
          canAccessDashboard: true,
          canAccessOrganization: true,
          canAccessAnalytics: true,
          canAccessTreeView: true,
          canSelectBranch: true,
          canSelectDepartment: true,
          canResetQueue: true,
          canViewAllBranches: true,
          canViewAllDepartments: true,
          canEditOrganization: true,
          canViewPlan: true,
          canInviteMembers: true,
          canEditMembers: true,
          canDeleteMembers: true,
          canRefreshQRCodes: true,
          canViewOrganizationDetails: true,
          canEditSelfRole: false, // Admin cannot edit their own role
          canEditOtherMembers: true,
          canAssignMembersInDepartment: true,
          canCreateBranch: true,
          canDeleteBranch: true,
          canEditBranch: true,
          canCreateDepartment: true,
          canDeleteDepartment: true,
          canEditDepartment: true,
          canCreateService: true,
          canDeleteService: true,
          canEditService: true,
          assignedBranchId: null, // Admin not assigned to specific branch
          assignedDepartmentIds: null, // Admin not assigned to specific departments
          shouldAutoSelectBranch: false,
          shouldAutoSelectDepartment: false,
        };

      case "manager":
        return {
          // Manager is assigned to specific branch, has enhanced organization access
          canAccessDashboard: true,
          canAccessOrganization: true,
          canAccessAnalytics: true,
          canAccessTreeView: true,
          canSelectBranch: false, // Cannot select branch - auto-assigned
          canSelectDepartment: true,
          canResetQueue: true,
          canViewAllBranches: false, // Only sees assigned branch
          canViewAllDepartments: true, // Can see departments in their branch
          canEditOrganization: false, // Cannot edit org details
          canViewPlan: false, // Cannot view subscription plan
          canInviteMembers: false, // Cannot invite members
          canEditMembers: false, // Cannot edit admin members
          canDeleteMembers: false, // Cannot delete members
          canRefreshQRCodes: false, // Cannot refresh QR codes
          canViewOrganizationDetails: true, // Can view organization details (read-only)
          canEditSelfRole: false, // Cannot edit own role
          canEditOtherMembers: false, // Cannot edit roles of other members
          canAssignMembersInDepartment: true, // Can assign members to departments in their branch
          canCreateBranch: false, // Cannot create branches
          canDeleteBranch: false, // Cannot delete branches
          canEditBranch: false, // Cannot edit branches
          canCreateDepartment: true, // Can create departments in their branch
          canDeleteDepartment: true, // Can delete departments in their branch
          canEditDepartment: true, // Can edit departments in their branch
          canCreateService: true, // Can create services
          canDeleteService: true, // Can delete services
          canEditService: true, // Can edit services
          assignedBranchId: branchId,
          assignedDepartmentIds: departmentIds,
          shouldAutoSelectBranch: true, // Auto-select assigned branch
          shouldAutoSelectDepartment: false,
        };

      case "employee":
        return {
          // Employee is assigned to specific department, dashboard-only access
          canAccessDashboard: true,
          canAccessOrganization: false, // No organization access
          canAccessAnalytics: false, // No analytics access
          canAccessTreeView: false, // No tree view access
          canSelectBranch: false, // Cannot select branch - auto-assigned
          canSelectDepartment: false, // Cannot select department - auto-assigned
          canResetQueue: false, // Cannot reset queue
          canViewAllBranches: false, // Only sees assigned branch
          canViewAllDepartments: false, // Only sees assigned departments
          canEditOrganization: false,
          canViewPlan: false,
          canInviteMembers: false,
          canEditMembers: false,
          canDeleteMembers: false,
          canRefreshQRCodes: false,
          canViewOrganizationDetails: false,
          canEditSelfRole: false,
          canEditOtherMembers: false,
          canAssignMembersInDepartment: false,
          canCreateBranch: false,
          canDeleteBranch: false,
          canEditBranch: false,
          canCreateDepartment: false,
          canDeleteDepartment: false,
          canEditDepartment: false,
          canCreateService: false,
          canDeleteService: false,
          canEditService: false,
          assignedBranchId: branchId,
          assignedDepartmentIds: departmentIds,
          shouldAutoSelectBranch: true, // Auto-select assigned branch
          shouldAutoSelectDepartment: true, // Auto-select assigned department
        };

      default:
        // Fallback to restrictive permissions
        return {
          canAccessDashboard: false,
          canAccessOrganization: false,
          canAccessAnalytics: false,
          canAccessTreeView: false,
          canSelectBranch: false,
          canSelectDepartment: false,
          canResetQueue: false,
          canViewAllBranches: false,
          canViewAllDepartments: false,
          canEditOrganization: false,
          canViewPlan: false,
          canInviteMembers: false,
          canEditMembers: false,
          canDeleteMembers: false,
          canRefreshQRCodes: false,
          canViewOrganizationDetails: false,
          canEditSelfRole: false,
          canEditOtherMembers: false,
          canAssignMembersInDepartment: false,
          canCreateBranch: false,
          canDeleteBranch: false,
          canEditBranch: false,
          canCreateDepartment: false,
          canDeleteDepartment: false,
          canEditDepartment: false,
          canCreateService: false,
          canDeleteService: false,
          canEditService: false,
          assignedBranchId: null,
          assignedDepartmentIds: null,
          shouldAutoSelectBranch: false,
          shouldAutoSelectDepartment: false,
        };
    }
  }, [userProfile]);

  return {
    ...permissions,
    userRole: userProfile?.role || null,
    loading,
  };
};
