import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { Member } from "../shared/types";

export const useMemberOperations = () => {
  const [isUpdatingRole, setIsUpdatingRole] = useState<Record<string, boolean>>(
    {}
  );
  const [isRemovingMember, setIsRemovingMember] = useState<
    Record<string, boolean>
  >({});

  const updateMemberRole = useCallback(
    async (
      memberId: string,
      newRole: "admin" | "manager" | "employee",
      setMembers: React.Dispatch<React.SetStateAction<Member[]>>,
      showSuccess: (title: string, message: string) => void,
      showError: (title: string, message: string) => void
    ) => {
      setIsUpdatingRole((prev) => ({ ...prev, [memberId]: true }));

      try {
        const { error } = await supabase
          .from("members")
          .update({ role: newRole })
          .eq("id", memberId);

        if (error) throw error;

        // Update local state
        setMembers((prev) =>
          prev.map((member) =>
            member.id === memberId ? { ...member, role: newRole } : member
          )
        );

        showSuccess(
          "Role Updated Successfully!",
          `Member role has been updated to ${newRole}.`
        );

        logger.info("Member role updated:", { memberId, newRole });
      } catch (error) {
        logger.error("Error updating member role:", error);
        showError(
          "Update Failed",
          "Unable to update member role. Please try again."
        );
      } finally {
        setIsUpdatingRole((prev) => ({ ...prev, [memberId]: false }));
      }
    },
    []
  );

  const removeMember = useCallback(
    async (
      memberId: string,
      memberName: string,
      setMembers: React.Dispatch<React.SetStateAction<Member[]>>,
      showSuccess: (title: string, message: string) => void,
      showError: (title: string, message: string) => void,
      removalType: "deactivate" | "permanent" = "deactivate"
    ) => {
      setIsRemovingMember((prev) => ({ ...prev, [memberId]: true }));

      try {
        if (removalType === "permanent") {
          // Use server-side API for permanent deletion with admin privileges
          const response = await fetch("/api/delete-member", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              memberId,
              memberName,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(
              result.error || "Failed to permanently delete member"
            );
          }

          // Remove from local state
          setMembers((prev) => prev.filter((member) => member.id !== memberId));

          // Show detailed success message
          const cleanupDetails = [];
          if (result.avatarDeleted) cleanupDetails.push("avatar files");
          if (result.authUserDeleted)
            cleanupDetails.push("authentication account");

          const cleanupText =
            cleanupDetails.length > 0
              ? ` including ${cleanupDetails.join(" and ")}`
              : "";

          showSuccess(
            "Member Completely Removed!",
            `${result.memberName} has been permanently removed from the organization${cleanupText}. They can be re-invited with a fresh account.`
          );

          logger.info("Member permanently removed with full cleanup:", {
            memberId,
            memberName: result.memberName,
            email: result.email,
            avatarDeleted: result.avatarDeleted,
            authUserDeleted: result.authUserDeleted,
          });
        } else {
          // Soft deletion - deactivate but keep record and assignments
          const { error: updateError } = await supabase
            .from("members")
            .update({
              is_active: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", memberId);

          if (updateError) throw updateError;

          // Remove from local state
          setMembers((prev) => prev.filter((member) => member.id !== memberId));

          showSuccess(
            "Member Deactivated!",
            `${memberName} has been deactivated. Their branch and department assignments are preserved for easy reactivation.`
          );

          logger.info("Member deactivated from organization:", {
            memberId,
            memberName,
          });
        }
      } catch (error) {
        logger.error("Error removing member:", error);
        showError(
          "Removal Failed",
          "Unable to remove member. Please try again."
        );
      } finally {
        setIsRemovingMember((prev) => ({ ...prev, [memberId]: false }));
      }
    },
    []
  );

  const reactivateMember = useCallback(
    async (
      memberId: string,
      memberName: string,
      newRole: "admin" | "manager" | "employee",
      setMembers: React.Dispatch<React.SetStateAction<Member[]>>,
      showSuccess: (title: string, message: string) => void,
      showError: (title: string, message: string) => void,
      refreshMembers: () => void
    ) => {
      try {
        // Reactivate the member with new role
        const { error: updateError } = await supabase
          .from("members")
          .update({
            is_active: true,
            role: newRole,
            updated_at: new Date().toISOString(),
          })
          .eq("id", memberId);

        if (updateError) throw updateError;

        showSuccess(
          "Member Reactivated!",
          `${memberName} has been reactivated as ${newRole}.`
        );

        // Refresh the members list to show the reactivated member
        refreshMembers();

        logger.info("Member reactivated:", {
          memberId,
          memberName,
          newRole,
        });
      } catch (error) {
        logger.error("Error reactivating member:", error);
        showError(
          "Reactivation Failed",
          "Unable to reactivate member. Please try again."
        );
      }
    },
    []
  );

  const inviteMember = useCallback(
    async (
      email: string,
      role: "admin" | "manager" | "employee",
      organizationId: string,
      organizationName: string,
      setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
      showSuccess: (title: string, message: string) => void,
      showError: (title: string, message: string) => void,
      onClose: () => void,
      branchId?: string,
      departmentIds?: string[]
    ) => {
      setIsLoading(true);

      try {
        // Skip member existence check for now (handled by API)
        // The API will handle checking for existing members using service role
        logger.info("Sending invitation without client-side member check");

        // Use the server-side API route for invitations
        const response = await fetch("/api/invite-member", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            role,
            organizationId,
            organizationName,
            branchId: branchId || null,
            departmentIds:
              departmentIds && departmentIds.length > 0 ? departmentIds : null,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to send invitation");
        }

        showSuccess(
          "Invitation Sent Successfully!",
          `An invitation has been sent to ${email}.`
        );

        onClose();
        logger.info("Invitation sent:", { email, role, organizationId });
      } catch (error) {
        logger.error("Error sending invitation:", error);
        showError(
          "Invitation Failed",
          "Unable to send invitation. Please check the email and try again."
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const resendInvitation = useCallback(
    async (
      email: string,
      role: "admin" | "manager" | "employee",
      organizationId: string,
      organizationName: string,
      showSuccess: (title: string, message: string) => void,
      showError: (title: string, message: string) => void
    ) => {
      try {
        // Use the server-side API route for resending invitations
        const response = await fetch("/api/invite-member", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            role,
            organizationId,
            organizationName,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to resend invitation");
        }

        showSuccess(
          "Invitation Resent!",
          `A new invitation has been sent to ${email}.`
        );

        logger.info("Invitation resent:", { email, role, organizationId });
      } catch (error) {
        logger.error("Error resending invitation:", error);
        showError(
          "Resend Failed",
          "Unable to resend invitation. Please try again."
        );
      }
    },
    []
  );

  const bulkInviteMembers = useCallback(
    async (
      invitations: Array<{
        email: string;
        role: "admin" | "manager" | "employee";
      }>,
      organizationId: string,
      organizationName: string,
      setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
      showSuccess: (title: string, message: string) => void,
      showError: (title: string, message: string) => void,
      showInfo: (title: string, message: string) => void,
      onClose: () => void
    ) => {
      setIsLoading(true);

      try {
        const results = [];

        for (const invitation of invitations) {
          try {
            // Check if user already exists in members table
            const { data: existingMember } = await supabase
              .from("members")
              .select("id, organization_id, email")
              .eq("email", invitation.email)
              .single();

            if (existingMember?.organization_id) {
              results.push({
                email: invitation.email,
                success: false,
                reason: "Already in organization",
              });
              continue;
            }

            // Send invitation via API route
            const response = await fetch("/api/invite-member", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: invitation.email,
                role: invitation.role,
                organizationId,
                organizationName,
              }),
            });

            const result = await response.json();

            results.push({
              email: invitation.email,
              success: response.ok,
              reason: response.ok ? null : result.error || "Failed to send",
            });
          } catch (error) {
            results.push({
              email: invitation.email,
              success: false,
              reason: "Failed to send",
            });
          }
        }

        const successful = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);

        if (successful.length > 0) {
          showSuccess(
            "Bulk Invitations Sent!",
            `Successfully sent ${successful.length} invitation${
              successful.length === 1 ? "" : "s"
            }.`
          );
        }

        if (failed.length > 0) {
          showInfo(
            "Some Invitations Failed",
            `${failed.length} invitation${
              failed.length === 1 ? "" : "s"
            } could not be sent. Please review and try again.`
          );
        }

        onClose();
        logger.info("Bulk invitations processed:", {
          successful: successful.length,
          failed: failed.length,
        });
      } catch (error) {
        logger.error("Error sending bulk invitations:", error);
        showError(
          "Bulk Invitation Failed",
          "Unable to process bulk invitations. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updateMemberBranch = useCallback(
    async (
      memberId: string,
      branchId: string | null,
      setMembers: React.Dispatch<React.SetStateAction<Member[]>>,
      showSuccess: (title: string, message: string) => void,
      showError: (title: string, message: string) => void
    ) => {
      try {
        const { error } = await supabase
          .from("members")
          .update({ branch_id: branchId })
          .eq("id", memberId);

        if (error) throw error;

        // Update local state
        setMembers((prev) =>
          prev.map((member) =>
            member.id === memberId ? { ...member, branch_id: branchId } : member
          )
        );

        showSuccess(
          "Branch Assignment Updated!",
          branchId
            ? "Member has been assigned to the selected branch."
            : "Member has been unassigned from branch."
        );

        logger.info("Member branch assignment updated:", {
          memberId,
          branchId,
        });
      } catch (error) {
        logger.error("Error updating member branch assignment:", error);
        showError(
          "Assignment Failed",
          "Unable to update branch assignment. Please try again."
        );
      }
    },
    []
  );

  const updateMemberDepartments = useCallback(
    async (
      memberId: string,
      departmentIds: string[] | null,
      setMembers: React.Dispatch<React.SetStateAction<Member[]>>,
      showSuccess: (title: string, message: string) => void,
      showError: (title: string, message: string) => void
    ) => {
      try {
        // Format department IDs as PostgreSQL array format
        const departmentIdsString = departmentIds?.length
          ? `{${departmentIds.join(",")}}` // PostgreSQL array format: {id1,id2,id3}
          : null;

        const { error } = await supabase
          .from("members")
          .update({ department_ids: departmentIdsString })
          .eq("id", memberId);

        if (error) throw error;

        // Update local state
        setMembers((prev) =>
          prev.map((member) =>
            member.id === memberId
              ? {
                  ...member,
                  department_ids: departmentIds, // Keep as string[] | null for frontend consistency
                }
              : member
          )
        );

        showSuccess(
          "Department Assignment Updated!",
          departmentIds?.length
            ? `Member has been assigned to ${departmentIds.length} department(s).`
            : "Member has been unassigned from all departments."
        );

        logger.info("Member department assignment updated:", {
          memberId,
          departmentIds: departmentIdsString,
        });
      } catch (error) {
        logger.error("Error updating member department assignment:", error);
        showError(
          "Assignment Failed",
          "Unable to update department assignment. Please try again."
        );
      }
    },
    []
  );

  return {
    updateMemberRole,
    updateMemberBranch,
    updateMemberDepartments,
    removeMember,
    reactivateMember,
    inviteMember,
    resendInvitation,
    bulkInviteMembers,
    isUpdatingRole,
    isRemovingMember,
  };
};
