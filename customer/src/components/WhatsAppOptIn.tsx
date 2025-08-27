"use client";

import { useState } from "react";
import { MessageCircle, Smartphone, Clock, Bell } from "lucide-react";

interface WhatsAppOptInProps {
  organizationName: string;
  phoneNumber: string;
  ticketNumber: string;
  serviceName: string;
  onOptIn: (optedIn: boolean) => void;
  onContinue: () => void;
  isLoading?: boolean;
}

export function WhatsAppOptIn({
  organizationName,
  phoneNumber,
  ticketNumber,
  serviceName,
  onOptIn,
  onContinue,
  isLoading = false,
}: WhatsAppOptInProps) {
  const [selectedOption, setSelectedOption] = useState<
    "whatsapp" | "none" | null
  >(null);

  // Check if we're in demo mode
  const isDemoMode = process.env.NEXT_PUBLIC_WHATSAPP_DEMO_MODE === "true";

  // Create WhatsApp deep link with pre-written message
  const createWhatsAppLink = () => {
    // TEMPORARY FIX: Hardcode the correct number until env vars work
    const whatsappNumber = "201015544028"; // Your actual UltraMessage connected number

    // Debug logging
    console.log("🔍 WhatsApp Debug:", {
      hardcodedNumber: whatsappNumber,
      envVar: process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER,
      isDemoMode,
      allEnvVars: Object.keys(process.env).filter((key) =>
        key.includes("WHATSAPP")
      ),
    });

    // Pre-written message for customer to send
    const message = encodeURIComponent(
      `Hi ${organizationName}! I'd like to receive queue notifications for my ticket ${ticketNumber} (${serviceName}). Please activate WhatsApp notifications for ${phoneNumber}. Thank you!`
    );

    // Universal WhatsApp link that works on all platforms
    const link = `https://wa.me/${whatsappNumber}?text=${message}`;
    console.log("🔗 WhatsApp Link:", link);

    return link;
  };

  const handleWhatsAppOptIn = () => {
    setSelectedOption("whatsapp");
    onOptIn(true);

    // Check if we're in demo mode
    const isDemoMode = process.env.NEXT_PUBLIC_WHATSAPP_DEMO_MODE === "true";

    if (isDemoMode) {
      // In demo mode, show an alert instead of opening WhatsApp
      alert(`Demo Mode: In production, this would open WhatsApp to send a message to your business number. 

Message that would be sent:
"Hi ${organizationName}! I'd like to receive queue notifications for my ticket ${ticketNumber} (${serviceName}). Please activate WhatsApp notifications for ${phoneNumber}. Thank you!"

For testing, we'll simulate that you sent this message and create an active session.`);

      // Simulate sending the message by calling the webhook directly
      simulateWhatsAppMessage();
    } else {
      // Production/Development mode: Open WhatsApp with pre-written message
      const whatsappLink = createWhatsAppLink();

      // Check if we're on mobile for better UX
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      if (isMobile) {
        // On mobile, try to open WhatsApp app directly
        window.location.href = whatsappLink;
      } else {
        // On desktop, open in new tab
        window.open(whatsappLink, "_blank");
      }

      // For development: Create session after a short delay to simulate user sending message
      // This simulates the webhook that would normally be triggered by UltraMessage
      setTimeout(() => {
        createDevelopmentSession();
      }, 3000); // 3 second delay to simulate user sending the message
    }
  };

  // Create development session (simulates webhook)
  const createDevelopmentSession = async () => {
    try {
      // Use the customer app's own API route instead of calling admin app
      const sessionUrl = `/api/whatsapp/create-session`;

      const payload = {
        phone: phoneNumber.replace("+", ""),
        // Note: organization_id is optional for customer sessions
      };

      console.log("🔄 Development: Creating WhatsApp session...", payload);

      const response = await fetch(sessionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        console.log("✅ Development: WhatsApp session created successfully", {
          sessionId: result.sessionId,
          expiresAt: result.expiresAt,
        });

        // Show user feedback
        const notification = document.createElement("div");
        notification.style.cssText = `
          position: fixed; 
          top: 20px; 
          right: 20px; 
          background: #25D366; 
          color: white; 
          padding: 12px 16px; 
          border-radius: 8px; 
          z-index: 9999;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        notification.textContent =
          "✅ WhatsApp session activated! Notifications enabled.";
        document.body.appendChild(notification);

        setTimeout(() => {
          document.body.removeChild(notification);
        }, 4000);
      } else {
        console.error(
          "❌ Development: Failed to create WhatsApp session:",
          result
        );
      }
    } catch (error) {
      console.error("❌ Development: Error creating WhatsApp session:", error);
    }
  };

  // Simulate WhatsApp message for demo mode
  const simulateWhatsAppMessage = async () => {
    try {
      const adminUrl =
        process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001";
      const webhookUrl = `${adminUrl}/api/webhooks/ultramsg/inbound`;

      // Simulate the webhook payload that UltraMessage would send
      const simulatedWebhookPayload = {
        from: phoneNumber.replace("+", ""),
        body: `Hi ${organizationName}! I'd like to receive queue notifications for my ticket ${ticketNumber} (${serviceName}). Please activate WhatsApp notifications for ${phoneNumber}. Thank you!`,
        type: "text",
        timestamp: Math.floor(Date.now() / 1000),
      };

      console.log(
        "🔄 Demo Mode: Simulating WhatsApp message...",
        simulatedWebhookPayload
      );

      // Send the simulated webhook
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(simulatedWebhookPayload),
      });

      console.log("✅ Demo Mode: WhatsApp session simulated successfully");
    } catch (error) {
      console.error("❌ Demo Mode: Error simulating WhatsApp message:", error);
    }
  };

  const handleSkip = () => {
    setSelectedOption("none");
    onOptIn(false);
  };

  return (
    <div className="card p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Stay Updated with WhatsApp
        </h3>
        <p className="text-gray-600">
          Get real-time notifications about your queue status directly on
          WhatsApp
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {/* WhatsApp Option */}
        <div
          className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
            selectedOption === "whatsapp"
              ? "border-green-500 bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={handleWhatsAppOptIn}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">
                Enable WhatsApp Notifications
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Get notified when it's almost your turn and when your ticket is
                called
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>"Almost your turn" alert</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Bell className="w-3 h-3" />
                  <span>"Your turn now" notification</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Smartphone className="w-3 h-3" />
                  <span>Quick and reliable delivery</span>
                </div>
              </div>
            </div>
            {selectedOption === "whatsapp" && (
              <div className="flex-shrink-0">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Skip Option */}
        <div
          className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
            selectedOption === "none"
              ? "border-gray-500 bg-gray-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={handleSkip}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">
                Continue Without WhatsApp
              </h4>
              <p className="text-sm text-gray-600">
                You'll only receive push notifications (if enabled)
              </p>
            </div>
            {selectedOption === "none" && (
              <div className="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedOption === "whatsapp" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <MessageCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-800 font-medium mb-1">
                {isDemoMode ? "Demo Mode Active" : "WhatsApp Setup in Progress"}
              </p>
              <p className="text-blue-700">
                {isDemoMode
                  ? "WhatsApp session has been simulated. In production, customers would send a real WhatsApp message to activate notifications."
                  : "Please send the message in WhatsApp to activate notifications. Your session will be created automatically within a few seconds."}
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onContinue}
        disabled={!selectedOption || isLoading}
        className="w-full dynamic-button text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading
          ? "Creating Ticket..."
          : selectedOption === "whatsapp"
          ? "Continue (WhatsApp Notifications Enabled)"
          : selectedOption === "none"
          ? "Continue (Push Notifications Only)"
          : "Select Notification Preference"}
      </button>

      {selectedOption === "whatsapp" && (
        <p className="text-center text-xs text-gray-500 mt-3">
          By enabling WhatsApp notifications, you agree to receive queue updates
          from {organizationName} via WhatsApp
        </p>
      )}
    </div>
  );
}
