"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { Lock } from "lucide-react";
import ManageTreePage from "../manage/tree";

// Force dynamic rendering for client-side features
export const dynamic = "force-dynamic";

export default function TreePage() {
  const permissions = useRolePermissions();

  if (permissions.loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-celestial-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!permissions.canAccessTreeView) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-screen text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-600">
            You don't have permission to access the Tree View. Contact your
            administrator for access.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Full-screen tree view with proper overflow management */}
      <div className="h-screen w-full overflow-hidden">
        <ManageTreePage />
      </div>
    </DashboardLayout>
  );
}
