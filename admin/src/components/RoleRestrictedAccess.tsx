import React from "react";
import { useRolePermissions, UserRole } from "@/hooks/useRolePermissions";
import { canAccessRoute } from "@/lib/roleUtils";
import { AlertCircle, Lock } from "lucide-react";

interface RoleRestrictedAccessProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  route?: string;
  fallback?: React.ReactNode;
  showMessage?: boolean;
}

/**
 * Component that restricts access based on user role
 * Can be used to wrap components, routes, or features
 */
export const RoleRestrictedAccess: React.FC<RoleRestrictedAccessProps> = ({
  children,
  allowedRoles,
  route,
  fallback,
  showMessage = true,
}) => {
  const { userRole, loading } = useRolePermissions();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-celestial-600"></div>
      </div>
    );
  }

  // Check route-based access
  if (route && !canAccessRoute(route, userRole)) {
    if (fallback) return <>{fallback}</>;

    if (showMessage) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this section.
          </p>
          <div className="text-sm text-gray-500">
            Required access level:{" "}
            {allowedRoles?.join(" or ") || "Higher privileges"}
          </div>
        </div>
      );
    }

    return null;
  }

  // Check role-based access
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    if (fallback) return <>{fallback}</>;

    if (showMessage) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span className="text-sm">
              Feature not available for {userRole} role
            </span>
          </div>
        </div>
      );
    }

    return null;
  }

  // Render children if access is allowed
  return <>{children}</>;
};

/**
 * Higher-order component for role-based access control
 */
export const withRoleAccess = <P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: UserRole[],
  FallbackComponent?: React.ComponentType
) => {
  const WrappedComponent: React.FC<P> = (props) => {
    return (
      <RoleRestrictedAccess
        allowedRoles={allowedRoles}
        fallback={FallbackComponent ? <FallbackComponent /> : undefined}
      >
        <Component {...props} />
      </RoleRestrictedAccess>
    );
  };

  WrappedComponent.displayName = `withRoleAccess(${
    Component.displayName || Component.name
  })`;
  return WrappedComponent;
};

/**
 * Hook to conditionally render content based on role permissions
 */
export const useRoleConditional = () => {
  const { userRole } = useRolePermissions();

  return {
    isAdmin: userRole === "admin",
    isManager: userRole === "manager",
    isEmployee: userRole === "employee",
    isManagerOrHigher: userRole === "admin" || userRole === "manager",
    renderFor: (roles: UserRole[], content: React.ReactNode) => {
      return roles.includes(userRole!) ? content : null;
    },
  };
};
