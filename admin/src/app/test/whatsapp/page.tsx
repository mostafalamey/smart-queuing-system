"use client";

import { useState, useEffect } from "react";

interface WhatsAppConfig {
  instanceId: string | null;
  hasToken: boolean;
  baseUrl: string;
  enabled: boolean;
  debugMode: boolean;
  configured: boolean;
  endpoint: string | null;
}

export default function WhatsAppTestPage() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch("/api/test/whatsapp");
      const data = await response.json();
      console.log("WhatsApp API Response:", data); // Debug log
      setConfig({
        ...data.config,
        configured: data.configured,
        endpoint: data.endpoint,
      });
    } catch (error) {
      console.error("Failed to fetch config:", error);
      setError("Failed to load configuration");
    }
  };

  const sendTestMessage = async () => {
    if (!phone) {
      setError("Please enter a phone number");
      return;
    }

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const response = await fetch("/api/test/whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
      } else {
        setError(data.error || "Test failed");
      }
    } catch (error) {
      setError(
        "Network error: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              WhatsApp Integration Test
            </h1>
            <p className="text-gray-600">
              Test UltraMessage WhatsApp API integration
            </p>
          </div>

          {/* Configuration Status */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Configuration Status</h2>
            {config ? (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Instance ID:</span>
                  <span
                    className={
                      config.instanceId ? "text-green-600" : "text-red-600"
                    }
                  >
                    {config.instanceId || "Not configured"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Token:</span>
                  <span
                    className={
                      config.hasToken ? "text-green-600" : "text-red-600"
                    }
                  >
                    {config.hasToken ? "✓ Configured" : "✗ Missing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">WhatsApp Enabled:</span>
                  <span
                    className={
                      config.enabled ? "text-green-600" : "text-amber-600"
                    }
                  >
                    {config.enabled ? "✓ Enabled" : "⚠️ Disabled"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Debug Mode:</span>
                  <span
                    className={
                      config.debugMode ? "text-blue-600" : "text-gray-600"
                    }
                  >
                    {config.debugMode ? "🔍 On" : "Off"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Overall Status:</span>
                  <span
                    className={
                      config.configured ? "text-green-600" : "text-red-600"
                    }
                  >
                    {config.configured ? "✅ Ready" : "❌ Not Ready"}
                  </span>
                </div>
                {config.endpoint && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-sm text-gray-600">
                      Endpoint:{" "}
                      <code className="bg-gray-200 px-1 rounded">
                        {config.endpoint}
                      </code>
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
            )}
          </div>

          {/* Test Form */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Send Test Message</h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Phone Number (with country code)
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="input-field"
                  disabled={loading}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Include country code (e.g., +1 for US, +966 for Saudi Arabia)
                </p>
              </div>

              <button
                onClick={sendTestMessage}
                disabled={loading || !config?.configured}
                className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                  loading || !config?.configured
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="opacity-25"
                      ></circle>
                      <path
                        fill="currentColor"
                        strokeWidth="4"
                        className="opacity-75"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending Test Message...
                  </span>
                ) : (
                  "Send Test Message"
                )}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <div className="text-red-500 mr-2">❌</div>
                <div>
                  <h3 className="font-medium text-red-800">Error</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Result */}
          {result && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex">
                <div className="text-green-500 mr-2">✅</div>
                <div className="flex-1">
                  <h3 className="font-medium text-green-800">Success!</h3>
                  <p className="text-green-700 mb-2">{result.message}</p>
                  <div className="text-sm text-green-600 space-y-1">
                    <div>Phone: {result.details.phone}</div>
                    {result.details.messageId && (
                      <div>Message ID: {result.details.messageId}</div>
                    )}
                    <div>Instance: {result.details.instanceId}</div>
                    <div>
                      Time:{" "}
                      {new Date(result.details.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">Instructions</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                • Make sure WhatsApp is connected to your UltraMessage instance
              </li>
              <li>• Use the complete phone number with country code</li>
              <li>
                • The test message will be sent immediately if configuration is
                correct
              </li>
              <li>• Check your WhatsApp to confirm the message was received</li>
              <li>
                • If debug mode is on, messages will be logged but not actually
                sent
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
