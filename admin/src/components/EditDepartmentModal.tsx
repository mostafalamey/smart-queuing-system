"use client";

import { useState, useEffect, useRef } from "react";
import { logger } from "@/lib/logger";
import { useAppToast } from "@/hooks/useAppToast";
import Portal from "./Portal";

interface EditDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: {
    id: string;
    name: string;
    description: string;
  } | null;
  onSave: (id: string, name: string, description: string) => Promise<void>;
}

export default function EditDepartmentModal({
  isOpen,
  onClose,
  department,
  onSave,
}: EditDepartmentModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useAppToast();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (department) {
      setName(department.name);
      setDescription(department.description);
    }
  }, [department]);

  // Prevent page scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      handleClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department) return;

    if (!name.trim() || !description.trim()) {
      showError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      await onSave(department.id, name.trim(), description.trim());
      showSuccess("Department updated successfully!");
      onClose();
    } catch (error) {
      logger.error("Error updating department:", error);
      showError("Failed to update department. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm z-[9999] p-4"
        onClick={handleBackdropClick}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
          <div
            ref={modalRef}
            className="bg-white rounded-2xl shadow-2xl transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800">
                  Edit Department
                </h3>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  title="Close modal"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="departmentName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Department Name
                </label>
                <input
                  type="text"
                  id="departmentName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="Enter department name"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="departmentDescription"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="departmentDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Enter department description"
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-celestial-500 text-white rounded-xl hover:bg-celestial-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </div>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
}
