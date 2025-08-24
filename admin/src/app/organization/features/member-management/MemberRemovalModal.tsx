"use client";

import React from "react";
import { AlertTriangle, UserX, Trash2, Info } from "lucide-react";
import { Member } from "../shared/types";

interface MemberRemovalModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onDeactivate: (memberId: string) => void;
  onPermanentDelete: (memberId: string) => void;
  processing: boolean;
  showWarning?: (
    title: string,
    message?: string,
    action?: { label: string; onClick: () => void }
  ) => void;
}

export const MemberRemovalModal: React.FC<MemberRemovalModalProps> = ({
  member,
  isOpen,
  onClose,
  onDeactivate,
  onPermanentDelete,
  processing,
  showWarning,
}) => {
  if (!isOpen || !member) return null;

  const handleDeactivate = () => {
    onDeactivate(member.id);
    onClose();
  };

  const handlePermanentDelete = () => {
    if (showWarning) {
      showWarning(
        `Permanently Delete ${member.name || member.email}?`,
        `This action cannot be undone, but will allow them to be re-invited.`,
        {
          label: "Delete Forever",
          onClick: () => {
            onPermanentDelete(member.id);
            onClose();
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
        onPermanentDelete(member.id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="analytics-card max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-orange-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Remove Member</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={processing}
          >
            <span className="sr-only">Close</span>
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              You are about to remove{" "}
              <strong>{member.name || member.email}</strong> from the
              organization.
            </p>
            <p className="text-sm text-gray-600">
              Please choose how you want to handle this removal:
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {/* Deactivate Option */}
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <div className="flex items-start">
                <UserX className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">
                    Deactivate Member (Recommended)
                  </h4>
                  <p className="text-xs text-blue-700 mb-3">
                    Member keeps their account but loses access to organization
                    resources. They can still sign in but won't see any
                    departments or services. Can be reactivated later if needed.
                  </p>
                  <button
                    onClick={handleDeactivate}
                    disabled={processing}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {processing ? "Processing..." : "Deactivate Member"}
                  </button>
                </div>
              </div>
            </div>

            {/* Permanent Delete Option */}
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <div className="flex items-start">
                <Trash2 className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-900 mb-1">
                    Permanently Delete
                  </h4>
                  <p className="text-xs text-red-700 mb-3">
                    Completely removes member from database. They can be
                    re-invited with a fresh account. Use this if you want to
                    clean up your member list and allow re-invitations.
                  </p>
                  <button
                    onClick={handlePermanentDelete}
                    disabled={processing}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {processing ? "Processing..." : "Delete Permanently"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-4 bg-gray-50 rounded-lg p-3">
            <div className="flex items-start">
              <Info className="w-4 h-4 text-gray-500 mt-0.5 mr-2" />
              <div className="text-xs text-gray-600">
                <p className="font-medium mb-1">Re-invitation Process:</p>
                <p>
                  If you permanently delete a member, you can re-invite them
                  using their email address. They'll receive a fresh invitation
                  and can create a new account.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
