"use client";

import { useState, useEffect, useRef } from "react";
import { logger } from "@/lib/logger";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { useAppToast } from "@/hooks/useAppToast";
import { User, Upload, Camera, X } from "lucide-react";
import Image from "next/image";

export default function ProfilePage() {
  const { user, userProfile, refreshUser } = useAuth();
  const { showSuccess, showError } = useAppToast();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || "");
      setAvatarPreview(userProfile.avatar_url || null);
    }
  }, [userProfile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        showError("Please select an image file");
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showError("Image size must be less than 5MB");
        return;
      }

      setAvatarFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

    // Delete existing avatar if it exists
    if (userProfile?.avatar_url) {
      try {
        const existingPath = userProfile.avatar_url
          .split("/")
          .slice(-2)
          .join("/"); // Get "user_id/filename"
        await supabase.storage.from("avatars").remove([existingPath]);
      } catch (error) {
        logger.warn("Could not delete existing avatar:", error);
      }
    }

    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(data.path);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.id) return;

    if (!name.trim()) {
      showError("Name is required");
      return;
    }

    setIsLoading(true);
    try {
      let avatarUrl = userProfile.avatar_url;

      // Upload new avatar if selected
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }

      // Update user profile
      const { error } = await supabase
        .from("members")
        .update({
          name: name.trim(),
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userProfile.id);

      if (error) {
        throw error;
      }

      showSuccess("Profile updated successfully!");
      await refreshUser();
    } catch (error) {
      logger.error("Error updating profile:", error);
      showError("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Edit Profile
          </h1>
          <p className="text-gray-600">
            Update your personal information and avatar
          </p>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-4">
                {avatarPreview ? (
                  <div className="relative">
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-32 h-32 rounded-full object-cover border-4 border-celestial-200 shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={removeAvatar}
                      title="Remove avatar"
                      className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors duration-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-gradient-to-br from-celestial-400 to-celestial-500 rounded-full flex items-center justify-center border-4 border-celestial-200 shadow-lg">
                    <User className="w-16 h-16 text-white" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload new avatar"
                  className="absolute -bottom-2 -right-2 w-10 h-10 bg-yellowgreen-500 hover:bg-yellowgreen-600 text-white rounded-full flex items-center justify-center transition-colors duration-200 shadow-lg"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Upload avatar image"
              />

              <p className="text-sm text-gray-500 text-center">
                Click the camera icon to upload a new avatar
                <br />
                <span className="text-xs">JPG, PNG or GIF. Max 5MB</span>
              </p>
            </div>

            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* Current Role (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-600">
                {userProfile?.role || "N/A"}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Role cannot be changed
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="flex-1 px-6 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-celestial-500 text-white rounded-xl hover:bg-celestial-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
    </DashboardLayout>
  );
}
