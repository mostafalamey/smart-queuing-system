"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Building2, CheckCircle, X, Loader2 } from "lucide-react";

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    handleInvitationAcceptance();
  }, []);

  const handleInvitationAcceptance = async () => {
    setLoading(true);

    try {
      console.log("=== SUPABASE NATIVE INVITATION HANDLING ===");

      // Get URL parameters for our custom invitation data
      const org = searchParams.get("org");
      const role = searchParams.get("role") as "admin" | "manager" | "employee";
      const orgName = searchParams.get("orgName");

      // Check for Supabase authentication parameters
      let access_token = searchParams.get("access_token");
      let refresh_token = searchParams.get("refresh_token");

      // Check for errors and tokens in hash fragment
      let authError = null;
      let authErrorCode = null;
      let authErrorDescription = null;

      if (typeof window !== "undefined") {
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );

        if (!access_token) {
          access_token = hashParams.get("access_token");
          refresh_token = hashParams.get("refresh_token");
        }

        authError = hashParams.get("error");
        authErrorCode = hashParams.get("error_code");
        authErrorDescription = hashParams.get("error_description");

        console.log("Hash Parameters:", Object.fromEntries(hashParams));
      }

      console.log("URL Parameters:", {
        org,
        role,
        orgName,
        access_token: !!access_token,
        refresh_token: !!refresh_token,
      });

      // Handle authentication errors (expired invitations, etc.)
      if (authError) {
        console.error("Authentication error:", {
          authError,
          authErrorCode,
          authErrorDescription,
        });

        if (authErrorCode === "otp_expired") {
          setError(
            "This invitation link has expired. Please request a new invitation from your administrator."
          );
        } else {
          setError(
            `Authentication error: ${authErrorDescription || authError}`
          );
        }

        setLoading(false);
        return;
      }

      // Check if this is a Supabase invitation acceptance flow
      if (org && role && orgName) {
        console.log("Processing Supabase native invitation...");

        // Handle auth tokens from Supabase redirect
        if (access_token) {
          console.log("Setting session from access token...");
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || "",
          });

          if (error) {
            console.error("Error setting session:", error);
            setError(
              "Authentication failed. Please try the invitation link again."
            );
            setLoading(false);
            return;
          }
        }

        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userEmail = session?.user?.email || "";

        console.log("User email from session:", userEmail);

        if (!userEmail) {
          setError(
            "Could not determine user email. Please try the invitation link again."
          );
          setLoading(false);
          return;
        }

        setInvitationData({
          organization_id: org,
          role: role,
          organization_name: decodeURIComponent(orgName),
          email: userEmail,
          type: "supabase_native",
        });

        setLoading(false);
        return;
      }

      // If no valid invitation parameters
      setError("Invalid invitation link");
      setLoading(false);
    } catch (err: any) {
      console.error("Error handling invitation:", err);
      setError("Failed to process invitation");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validation
      if (!formData.name || !formData.password || !formData.confirmPassword) {
        setError("Please fill in all fields");
        setLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }

      if (formData.password.length < 8) {
        setError("Password must be at least 8 characters long");
        setLoading(false);
        return;
      }

      console.log("=== ACCEPTING SUPABASE INVITATION ===");

      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setError(
          "Authentication session not found. Please try the invitation link again."
        );
        setLoading(false);
        return;
      }

      // Update user password and metadata
      const { data: updateData, error: updateError } =
        await supabase.auth.updateUser({
          password: formData.password,
          data: {
            name: formData.name,
            role: invitationData.role,
            organization_id: invitationData.organization_id,
            organization_name: invitationData.organization_name,
          },
        });

      if (updateError) {
        console.error("Auth update error:", updateError);
        setError(`Failed to set password: ${updateError.message}`);
        setLoading(false);
        return;
      }

      console.log("User password set successfully:", updateData.user?.id);

      // Update existing member record instead of creating new one
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .update({
          auth_user_id: session.user.id,
          name: formData.name,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("email", invitationData.email)
        .eq("organization_id", invitationData.organization_id)
        .select();

      if (memberError) {
        console.error("Member activation error:", memberError);
        setError(`Failed to activate member profile: ${memberError.message}`);
        setLoading(false);
        return;
      }

      console.log("Member record activated successfully:", memberData);

      setSuccess(true);

      // Give time for the database to settle and then redirect with a full reload
      console.log("Account setup complete, redirecting...");

      setTimeout(() => {
        // Use window.location instead of router.push to trigger a full page reload
        // This ensures the AuthContext reinitializes and fetches the new member profile
        window.location.href = "/dashboard";
      }, 2500);
    } catch (err: any) {
      console.error("Invitation acceptance error:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  // Loading state
  if (loading && !invitationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Processing invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !invitationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
          <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            Invalid Invitation
          </h1>
          <p className="text-gray-600 mb-4">{error}</p>
          {error.includes("expired") && (
            <div className="text-sm text-red-600 bg-red-50 rounded p-3 mb-4">
              <p className="font-medium mb-1">What to do next:</p>
              <ul className="list-disc list-inside text-left space-y-1">
                <li>Contact your administrator to send a new invitation</li>
                <li>Check if you have a newer invitation email</li>
                <li>Make sure you're using the most recent invitation link</li>
              </ul>
            </div>
          )}
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome!</h1>
          <p className="text-gray-600 mb-4">
            Your account has been created successfully. Preparing your
            dashboard...
          </p>
          <div className="text-sm text-gray-500">
            You'll be redirected in a moment.
          </div>
        </div>
      </div>
    );
  }

  // Main invitation form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Join {invitationData?.organization_name}
          </h1>
          <p className="text-gray-600">
            You've been invited to join as a{" "}
            <span className="font-medium text-blue-600">
              {invitationData?.role}
            </span>
          </p>
          <p className="text-sm text-gray-500 mt-1">{invitationData?.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <X className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="input-field"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="input-field"
              placeholder="Create a password"
              minLength={8}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 8 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              className="input-field"
              placeholder="Confirm your password"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Setting up your account...
              </>
            ) : (
              "Complete Setup"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AcceptInvitation() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
