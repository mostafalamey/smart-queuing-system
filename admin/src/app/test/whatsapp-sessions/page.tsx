"use client";

import { useState } from "react";

interface TestResult {
  success: boolean;
  message?: string;
  configuration?: any;
  phoneStatus?: any;
  result?: any;
  error?: string;
  details?: string;
}

export default function WhatsAppSessionsTestPage() {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("+966123456789");
  const [loading, setLoading] = useState(false);

  const runConfigTest = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/test/whatsapp-sessions");
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const runPhoneTest = async (action: string) => {
    if (!phoneNumber.trim()) {
      alert("Please enter a phone number");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/test/whatsapp-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          action,
          organizationId: "test-org",
          customerName: "Test Customer",
        }),
      });
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            WhatsApp Sessions Test Page
          </h1>

          <div className="space-y-6">
            {/* Configuration Test */}
            <div className="border rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">Configuration Test</h2>
              <button
                onClick={runConfigTest}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading ? "Testing..." : "Check Configuration"}
              </button>
            </div>

            {/* Session Management Test */}
            <div className="border rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">
                Session Management Test
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Phone Number:
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+966123456789"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => runPhoneTest("check")}
                  disabled={loading}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  Check Status
                </button>
                <button
                  onClick={() => runPhoneTest("create")}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  Create Session
                </button>
                <button
                  onClick={() => runPhoneTest("extend")}
                  disabled={loading}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  Extend Session
                </button>
                <button
                  onClick={() => runPhoneTest("deactivate")}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  Deactivate Session
                </button>
              </div>
            </div>

            {/* Results */}
            {testResult && (
              <div className="border rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-4">Test Results</h2>
                <div
                  className={`p-4 rounded ${
                    testResult.success
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <pre className="text-sm overflow-auto max-h-96">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Webhook Information */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <h2 className="text-xl font-semibold mb-4">
                Webhook Setup Information
              </h2>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Webhook URL:</strong>{" "}
                  <code>
                    {typeof window !== "undefined"
                      ? window.location.origin
                      : "https://your-domain.com"}
                    /api/webhooks/ultramsg/inbound
                  </code>
                </p>
                <p>
                  <strong>Method:</strong> POST
                </p>
                <p>
                  <strong>Events:</strong> message (inbound messages)
                </p>
                <p>
                  <strong>Authentication:</strong> Token in request body
                </p>
              </div>

              <div className="mt-4 p-3 bg-yellow-100 rounded">
                <p className="text-sm">
                  <strong>Setup Instructions:</strong>
                </p>
                <ol className="text-sm mt-2 space-y-1 ml-4 list-decimal">
                  <li>Go to your UltraMessage dashboard</li>
                  <li>Navigate to Webhooks section</li>
                  <li>Add the webhook URL above</li>
                  <li>Select "message" events</li>
                  <li>Set the webhook token from your .env.local</li>
                  <li>
                    Test the webhook by sending a WhatsApp message to your
                    business number
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
