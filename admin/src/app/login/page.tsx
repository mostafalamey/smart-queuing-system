"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      // Check if there's a redirect parameter
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get("redirectTo");

      if (redirectTo && redirectTo.startsWith("/")) {
        router.replace(redirectTo);
      } else {
        router.replace("/dashboard");
      }
    }
  }, [user, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await signIn(email, password);

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        // Don't set loading to false here, let the auth context handle it
        // The useEffect above will handle the redirect
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  // Show loading if auth is still initializing or if user is authenticated
  if (authLoading || user) {
    return <LoadingSpinner message={user ? "Redirecting..." : "Loading..."} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-white rounded"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Smart Queue</h1>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Sign in to Admin Dashboard
          </h2>
          <p className="text-gray-600">
            Manage your queue system and monitor operations
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Remember me
                </label>
              </div>
              <button
                type="button"
                className="text-sm text-brand-primary hover:text-brand-dark"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="text-brand-primary hover:text-brand-dark font-medium"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
