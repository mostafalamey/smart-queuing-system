import { UserRole } from "@/hooks/useRolePermissions";

/**
 * Role-based utility functions for access control and UI filtering
 */

/**
 * Check if user has admin privileges
 */
export const isAdmin = (role: UserRole | null): boolean => {
  return role === "admin";
};

/**
 * Check if user has manager or higher privileges
 */
export const isManagerOrHigher = (role: UserRole | null): boolean => {
  return role === "admin" || role === "manager";
};

/**
 * Check if user has employee level access only
 */
export const isEmployeeOnly = (role: UserRole | null): boolean => {
  return role === "employee";
};

/**
 * Get allowed navigation items based on user role
 */
export const getAllowedNavigation = (role: UserRole | null) => {
  const allNavItems = ["dashboard", "organization", "analytics", "tree"];

  switch (role) {
    case "admin":
      return allNavItems; // Admin can access everything
    case "manager":
      return ["dashboard", "organization", "analytics", "tree"]; // Manager has analytics access
    case "employee":
      return ["dashboard"]; // Employee can only access dashboard
    default:
      return []; // No access for unauthenticated users
  }
};

/**
 * Get allowed organization tabs based on user role
 */
export const getAllowedOrganizationTabs = (role: UserRole | null) => {
  const allTabs = ["details", "qr", "members", "plan", "analytics", "messages"];

  switch (role) {
    case "admin":
      return allTabs; // Admin can access all tabs
    case "manager":
      return ["details", "qr", "members", "analytics", "messages"]; // Manager can access most tabs
    case "employee":
    default:
      return []; // Employee and others have no organization access
  }
};

/**
 * Check if user can perform specific organization actions
 */
export const getOrganizationPermissions = (role: UserRole | null) => {
  return {
    canEditDetails: isAdmin(role),
    canViewPlan: isAdmin(role),
    canInviteMembers: isAdmin(role),
    canEditMembers: isAdmin(role),
    canDeleteMembers: isAdmin(role),
    canRefreshQR: isAdmin(role),
    canViewQR: isManagerOrHigher(role),
  };
};

/**
 * Check if user can perform tree management actions
 */
export const getTreePermissions = (role: UserRole | null) => {
  return {
    canCreateBranch: isAdmin(role),
    canEditBranch: isAdmin(role),
    canDeleteBranch: isAdmin(role),
    canCreateDepartment: isManagerOrHigher(role),
    canEditDepartment: isManagerOrHigher(role),
    canDeleteDepartment: isManagerOrHigher(role),
    canCreateService: isManagerOrHigher(role),
    canEditService: isManagerOrHigher(role),
    canDeleteService: isManagerOrHigher(role),
  };
};

/**
 * Get dashboard-specific permissions
 */
export const getDashboardPermissions = (role: UserRole | null) => {
  return {
    canSelectBranch: isAdmin(role), // Only admin can select any branch
    canSelectDepartment: isManagerOrHigher(role), // Admin and manager can select departments
    canResetQueue: isManagerOrHigher(role), // Employee cannot reset queue
    canViewAllData: isAdmin(role), // Only admin sees all organizational data
  };
};

/**
 * Filter data based on user role and assignments
 * This will be enhanced when branch_id and department_ids are available
 */
export const filterDataByRole = <
  T extends { id: string; organization_id?: string }
>(
  data: T[],
  role: UserRole | null,
  userOrgId: string | null,
  assignedBranchId: string | null = null,
  assignedDepartmentIds: string[] | null = null
): T[] => {
  if (!role || !userOrgId) return [];

  // Filter by organization first
  const orgFilteredData = data.filter(
    (item) => item.organization_id === userOrgId || !item.organization_id
  );

  // For now, return organization-filtered data
  // TODO: Add branch/department filtering when assignments are implemented
  switch (role) {
    case "admin":
      return orgFilteredData; // Admin sees all data in organization
    case "manager":
      // TODO: Filter by assigned branch when branch_id is available
      return orgFilteredData;
    case "employee":
      // TODO: Filter by assigned department when department_ids is available
      return orgFilteredData;
    default:
      return [];
  }
};

/**
 * Get role display information
 */
export const getRoleDisplayInfo = (role: UserRole | null) => {
  switch (role) {
    case "admin":
      return {
        label: "Administrator",
        color: "bg-red-100 text-red-800",
        description: "Full system access",
      };
    case "manager":
      return {
        label: "Manager",
        color: "bg-blue-100 text-blue-800",
        description: "Branch management access",
      };
    case "employee":
      return {
        label: "Employee",
        color: "bg-green-100 text-green-800",
        description: "Dashboard access only",
      };
    default:
      return {
        label: "Unknown",
        color: "bg-gray-100 text-gray-800",
        description: "No access",
      };
  }
};

/**
 * Validate if user can access a specific route
 */
export const canAccessRoute = (
  route: string,
  role: UserRole | null
): boolean => {
  const allowedRoutes = getAllowedNavigation(role);

  // Extract base route from path
  const baseRoute = route.split("/")[1] || route;

  return allowedRoutes.includes(baseRoute);
};

/**
 * Get welcome message based on user role
 */
export const getWelcomeMessage = (
  role: UserRole | null,
  name: string | null
): string => {
  const userName = name || "User";

  switch (role) {
    case "admin":
      return `Welcome back, ${userName}! You have full administrative access.`;
    case "manager":
      return `Welcome back, ${userName}! Manage your branch operations from here.`;
    case "employee":
      return `Welcome back, ${userName}! Your dashboard shows your queue activity.`;
    default:
      return `Welcome, ${userName}!`;
  }
};
