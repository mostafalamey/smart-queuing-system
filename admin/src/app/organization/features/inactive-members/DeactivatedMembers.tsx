"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import {
  Users,
  UserX,
  UserPlus,
  RotateCcw,
  AlertTriangle,
  Info,
  Trash2,
  Shield,
} from "lucide-react";

interface DeactivatedMember {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "employee";
  organization_id: string;
  is_active: boolean;
  deactivated_at: string;
  updated_at: string;
  auth_user_id: string | null;
}

interface DeactivatedMembersProps {
  organizationId: string;
  currentUserRole: string;
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
  onRefreshActiveMembers: () => void;
}

export const DeactivatedMembers: React.FC<DeactivatedMembersProps> = ({
  organizationId,
  currentUserRole,
  showSuccess,
  showError,
  showInfo,
  onRefreshActiveMembers,
}) => {
  const [deactivatedMembers, setDeactivatedMembers] = useState<
    DeactivatedMember[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});

  const canManageInactiveMembers = currentUserRole === "admin";

  useEffect(() => {
    if (canManageInactiveMembers) {
      fetchDeactivatedMembers();
    }
  }, [organizationId, canManageInactiveMembers]);

  // Realtime subscription for deactivated members
  useEffect(() => {
    if (!canManageInactiveMembers || !organizationId) return;

    const channel = supabase
      .channel("deactivated-members-realtime-tab")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "members",
          filter: `organization_id=eq.${organizationId} AND is_active=eq.false`,
        },
        (payload) => {
          console.log("Deactivated members tab change detected:", payload);

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
  }, [canManageInactiveMembers, organizationId]);

  const fetchDeactivatedMembers = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", false)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setDeactivatedMembers(data || []);

      logger.info("Deactivated members fetched:", { count: data?.length || 0 });
    } catch (error) {
      logger.error("Error fetching deactivated members:", error);
      showError("Loading Failed", "Unable to load deactivated members.");
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (
    member: DeactivatedMember,
    newRole: "admin" | "manager" | "employee"
  ) => {
    setProcessing((prev) => ({ ...prev, [member.id]: true }));

    try {
      const { error } = await supabase
        .from("members")
        .update({
          is_active: true,
          role: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq("id", member.id);

      if (error) throw error;

      // Remove from deactivated list
      setDeactivatedMembers((prev) => prev.filter((m) => m.id !== member.id));

      showSuccess(
        "Member Reactivated!",
        `${member.name || member.email} has been reactivated as ${newRole}.`
      );

      // Refresh active members list
      onRefreshActiveMembers();
    } catch (error) {
      logger.error("Error reactivating member:", error);
      showError("Reactivation Failed", "Unable to reactivate member.");
    } finally {
      setProcessing((prev) => ({ ...prev, [member.id]: false }));
    }
  };

  const handlePermanentDelete = async (member: DeactivatedMember) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete ${
          member.name || member.email
        }? ` +
          `This action cannot be undone and will allow them to be re-invited with a fresh account.`
      )
    ) {
      return;
    }

    setProcessing((prev) => ({ ...prev, [member.id]: true }));

    try {
      const { error } = await supabase
        .from("members")
        .delete()
        .eq("id", member.id);

      if (error) throw error;

      // Remove from deactivated list
      setDeactivatedMembers((prev) => prev.filter((m) => m.id !== member.id));

      showSuccess(
        "Member Permanently Removed!",
        `${
          member.name || member.email
        } has been permanently deleted and can now be re-invited.`
      );
    } catch (error) {
      logger.error("Error permanently deleting member:", error);
      showError("Deletion Failed", "Unable to permanently delete member.");
    } finally {
      setProcessing((prev) => ({ ...prev, [member.id]: false }));
    }
  };

  const handleDisableAccount = async (member: DeactivatedMember) => {
    if (!member.auth_user_id) {
      showError(
        "Cannot Disable",
        "This member has no associated authentication account."
      );
      return;
    }

    if (
      !confirm(
        `Are you sure you want to disable the authentication account for ${
          member.name || member.email
        }? ` + `This will prevent them from signing into the app entirely.`
      )
    ) {
      return;
    }

    showInfo(
      "Account Disable Requested",
      "This feature requires Supabase admin privileges. Please contact support to disable the user account."
    );

    // Note: Disabling auth accounts requires admin privileges
    // This would need to be implemented via an admin API endpoint
  };

  if (!canManageInactiveMembers) {
    return (
      <div className="analytics-card rounded-lg border p-8 text-center">
        <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Access Restricted
        </h3>
        <p className="text-gray-500">
          Only administrators can manage inactive members.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="analytics-card rounded-lg border p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading inactive members...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <UserX className="w-5 h-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">
            Inactive Members
          </h3>
          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {deactivatedMembers.length} inactive
          </span>
        </div>
        <button
          onClick={fetchDeactivatedMembers}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
          <div className="text-sm text-blue-700">
            <h4 className="font-medium mb-1">Member Management Options:</h4>
            <ul className="space-y-1 text-xs">
              <li>
                <strong>Reactivate:</strong> Restore member access with a new
                role
              </li>
              <li>
                <strong>Permanent Delete:</strong> Remove from database
                completely (allows re-invitation)
              </li>
              <li>
                <strong>Disable Account:</strong> Prevent authentication
                entirely (requires admin support)
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Members List */}
      {deactivatedMembers.length === 0 ? (
        <div className="analytics-card rounded-lg border p-8 text-center">
          <Users className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Inactive Members
          </h3>
          <p className="text-gray-500">
            All organization members are currently active!
          </p>
        </div>
      ) : (
        <div className="analytics-card rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Previous Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deactivated
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
                {deactivatedMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {member.name || "Unknown Name"}
                        </p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.role === "admin"
                            ? "bg-red-100 text-red-800"
                            : member.role === "manager"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(
                          member.deactivated_at || member.updated_at
                        ).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(
                          member.deactivated_at || member.updated_at
                        ).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <UserX className="w-3 h-3 mr-1" />
                        Inactive
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Reactivate Dropdown */}
                        <div className="relative inline-block text-left">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleReactivate(
                                  member,
                                  e.target.value as
                                    | "admin"
                                    | "manager"
                                    | "employee"
                                );
                                e.target.value = ""; // Reset select
                              }
                            }}
                            disabled={processing[member.id]}
                            title="Reactivate member with new role"
                            className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            <option value="">Reactivate as...</option>
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>

                        {/* Permanent Delete */}
                        <button
                          onClick={() => handlePermanentDelete(member)}
                          disabled={processing[member.id]}
                          className="inline-flex items-center p-2 border border-transparent rounded-md text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                          title="Permanently delete member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Disable Account */}
                        {member.auth_user_id && (
                          <button
                            onClick={() => handleDisableAccount(member)}
                            disabled={processing[member.id]}
                            className="inline-flex items-center p-2 border border-transparent rounded-md text-orange-600 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                            title="Disable authentication account"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
          <div className="text-sm text-yellow-700">
            <h4 className="font-medium mb-1">Re-invitation Process:</h4>
            <p>To re-invite someone who was permanently deleted:</p>
            <ol className="list-decimal list-inside mt-1 space-y-1 text-xs">
              <li>
                Permanently delete their inactive record (if not already done)
              </li>
              <li>Go to Member Management tab</li>
              <li>Use "Invite Member" with their email address</li>
              <li>They'll receive a fresh invitation email</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
