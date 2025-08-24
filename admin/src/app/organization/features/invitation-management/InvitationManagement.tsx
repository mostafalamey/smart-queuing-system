"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import {
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Trash2,
  Users,
  TrendingUp,
} from "lucide-react";
import { useMemberOperations } from "../shared/useMemberOperations";

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

interface InvitationManagementProps {
  organizationId: string;
  organizationName: string;
  currentUserRole: string;
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
}

export const InvitationManagement: React.FC<InvitationManagementProps> = ({
  organizationId,
  organizationName,
  currentUserRole,
  showSuccess,
  showError,
  showInfo,
}) => {
  const [pendingInvitations, setPendingInvitations] = useState<
    PendingInvitation[]
  >([]);
  const [invitationStats, setInvitationStats] = useState<InvitationStats>({
    total: 0,
    pending: 0,
    accepted: 0,
    acceptance_rate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resendingInvitations, setResendingInvitations] = useState<
    Record<string, boolean>
  >({});
  const [deletingInvitations, setDeletingInvitations] = useState<
    Record<string, boolean>
  >({});

  const { resendInvitation } = useMemberOperations();

  // Only allow admins to access invitation management
  const canManageInvitations = currentUserRole === "admin";

  useEffect(() => {
    if (canManageInvitations) {
      fetchInvitationData();
    }
  }, [organizationId, canManageInvitations]);

  const fetchInvitationData = async () => {
    try {
      setLoading(true);

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
      const accepted = allMembersData?.filter((m) => m.is_active).length || 0;
      const pending = allMembersData?.filter((m) => !m.is_active).length || 0;
      const acceptance_rate =
        total > 0 ? Math.round((accepted / total) * 100) : 0;

      setInvitationStats({
        total,
        pending,
        accepted,
        acceptance_rate,
      });

      logger.info("Invitation data fetched successfully", {
        pending: pending,
        total: total,
        acceptance_rate: acceptance_rate,
      });
    } catch (error) {
      logger.error("Error fetching invitation data:", error);
      showError(
        "Data Loading Failed",
        "Unable to load invitation data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInvitationData();
    setRefreshing(false);
    showSuccess("Data Refreshed", "Invitation data has been updated.");
  };

  const handleResendInvitation = async (invitation: PendingInvitation) => {
    setResendingInvitations((prev) => ({ ...prev, [invitation.id]: true }));

    try {
      await resendInvitation(
        invitation.email,
        invitation.role,
        organizationId,
        organizationName,
        showSuccess,
        showError
      );

      // Refresh data after successful resend
      await fetchInvitationData();
    } catch (error) {
      logger.error("Error resending invitation:", error);
    } finally {
      setResendingInvitations((prev) => ({ ...prev, [invitation.id]: false }));
    }
  };

  const handleDeletePendingInvitation = async (
    invitation: PendingInvitation
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete the pending invitation for ${invitation.email}?`
      )
    ) {
      return;
    }

    setDeletingInvitations((prev) => ({ ...prev, [invitation.id]: true }));

    try {
      const { error } = await supabase
        .from("members")
        .delete()
        .eq("id", invitation.id)
        .eq("is_active", false); // Safety check - only delete inactive invitations

      if (error) throw error;

      setPendingInvitations((prev) =>
        prev.filter((inv) => inv.id !== invitation.id)
      );

      showSuccess(
        "Invitation Deleted",
        `Pending invitation for ${invitation.email} has been removed.`
      );

      // Refresh stats
      await fetchInvitationData();
    } catch (error) {
      logger.error("Error deleting pending invitation:", error);
      showError(
        "Delete Failed",
        "Unable to delete invitation. Please try again."
      );
    } finally {
      setDeletingInvitations((prev) => ({ ...prev, [invitation.id]: false }));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getInvitationAgeStatus = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 3) return "recent";
    if (diffDays < 7) return "moderate";
    return "old";
  };

  if (!canManageInvitations) {
    return (
      <div className="analytics-card rounded-lg border p-8 text-center">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Access Restricted
        </h3>
        <p className="text-gray-500">
          Only administrators can access invitation management.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="analytics-card rounded-lg border p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading invitation data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="analytics-card rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Total Invitations
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {invitationStats.total}
              </p>
            </div>
          </div>
        </div>

        <div className="analytics-card rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">
                {invitationStats.pending}
              </p>
            </div>
          </div>
        </div>

        <div className="analytics-card rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Accepted</p>
              <p className="text-2xl font-semibold text-gray-900">
                {invitationStats.accepted}
              </p>
            </div>
          </div>
        </div>

        <div className="analytics-card rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Acceptance Rate
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {invitationStats.acceptance_rate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Invitations Section */}
      <div className="analytics-card rounded-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Mail className="w-5 h-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Pending Invitations
              </h3>
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {pendingInvitations.length} pending
              </span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {pendingInvitations.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Pending Invitations
              </h3>
              <p className="text-gray-500">
                All sent invitations have been accepted!
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invitee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingInvitations.map((invitation) => {
                  const ageStatus = getInvitationAgeStatus(
                    invitation.created_at
                  );

                  return (
                    <tr key={invitation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {invitation.name || invitation.email.split("@")[0]}
                          </p>
                          <p className="text-sm text-gray-500">
                            {invitation.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            invitation.role === "admin"
                              ? "bg-red-100 text-red-800"
                              : invitation.role === "manager"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {invitation.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(invitation.created_at)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(invitation.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            ageStatus === "recent"
                              ? "bg-green-100 text-green-800"
                              : ageStatus === "moderate"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {ageStatus === "recent"
                            ? "Recent"
                            : ageStatus === "moderate"
                            ? "Pending"
                            : "Expired?"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleResendInvitation(invitation)}
                            disabled={resendingInvitations[invitation.id]}
                            className="inline-flex items-center p-2 border border-transparent rounded-md text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            title="Resend invitation"
                          >
                            <Send
                              className={`w-4 h-4 ${
                                resendingInvitations[invitation.id]
                                  ? "animate-pulse"
                                  : ""
                              }`}
                            />
                          </button>
                          <button
                            onClick={() =>
                              handleDeletePendingInvitation(invitation)
                            }
                            disabled={deletingInvitations[invitation.id]}
                            className="inline-flex items-center p-2 border border-transparent rounded-md text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            title="Delete invitation"
                          >
                            <Trash2
                              className={`w-4 h-4 ${
                                deletingInvitations[invitation.id]
                                  ? "animate-pulse"
                                  : ""
                              }`}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Invitation Management Tips
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Recent:</strong> Invitations sent within the last 3
                  days
                </li>
                <li>
                  <strong>Pending:</strong> Invitations sent 3-7 days ago -
                  consider following up
                </li>
                <li>
                  <strong>Expired?:</strong> Invitations older than 7 days - may
                  need to be resent
                </li>
                <li>Use the resend button to send a fresh invitation email</li>
                <li>
                  Delete unused invitations to keep your member list clean
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
