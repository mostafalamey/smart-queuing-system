import React, { useState, useEffect } from "react";
import { useAppToast } from "@/hooks/useAppToast";
import { supabase } from "@/lib/supabase";
import {
  defaultMessageTemplates,
  processMessageTemplate,
  type MessageTemplates,
  type MessageTemplateData,
} from "../../../../../../shared/message-templates";
import { MessageSquare, Save, RotateCcw, Eye, Copy } from "lucide-react";

interface MessageTemplateManagementProps {
  organizationId: string;
  organizationName: string;
  welcomeMessage: string;
  onUpdateWelcomeMessage: (message: string) => Promise<void>;
  canEditWelcomeMessage: boolean;
}

export function MessageTemplateManagement({
  organizationId,
  organizationName,
  welcomeMessage,
  onUpdateWelcomeMessage,
  canEditWelcomeMessage,
}: MessageTemplateManagementProps) {
  const { showSuccess, showError, showInfo } = useAppToast();
  const [templates, setTemplates] = useState<MessageTemplates>(
    defaultMessageTemplates
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<
    "ticketCreated" | "youAreNext" | "yourTurn"
  >("ticketCreated");
  const [activeMessageType, setActiveMessageType] = useState<
    "whatsapp" | "push"
  >("whatsapp");
  const [showPreview, setShowPreview] = useState(false);

  // Local welcome message state with debounced updates
  const [localWelcomeMessage, setLocalWelcomeMessage] =
    useState(welcomeMessage);
  const [welcomeMessageTimeout, setWelcomeMessageTimeout] =
    useState<NodeJS.Timeout | null>(null);

  // Sample data for preview
  const sampleData: MessageTemplateData = {
    organizationName,
    ticketNumber: "BAK-001",
    serviceName: "Fresh Bread Counter",
    departmentName: "Bakery",
    customerName: "John Doe",
    estimatedWaitTime: "15 min",
    queuePosition: 3,
    totalInQueue: 8,
    currentlyServing: "BAK-256",
  };

  useEffect(() => {
    loadTemplates();
  }, [organizationId]);

  // Sync local welcome message with prop
  useEffect(() => {
    setLocalWelcomeMessage(welcomeMessage);
  }, [welcomeMessage]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (welcomeMessageTimeout) {
        clearTimeout(welcomeMessageTimeout);
      }
    };
  }, [welcomeMessageTimeout]);

  const loadTemplates = async () => {
    try {
      setLoading(true);

      // Try to load custom templates from database
      const { data: customTemplates, error } = await supabase
        .from("message_templates")
        .select("*")
        .eq("organization_id", organizationId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found
        throw error;
      }

      if (customTemplates?.templates) {
        setTemplates(customTemplates.templates);
      } else {
        // Use default templates
        setTemplates(defaultMessageTemplates);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      showError("Failed to load message templates");
      setTemplates(defaultMessageTemplates);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplates = async () => {
    try {
      setSaving(true);

      // Upsert the templates with proper conflict resolution
      const { error } = await supabase.from("message_templates").upsert(
        {
          organization_id: organizationId,
          templates: templates,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "organization_id",
          ignoreDuplicates: false,
        }
      );

      if (error) throw error;

      showSuccess("Message templates saved successfully!");
    } catch (error) {
      console.error("Error saving templates:", error);
      showError("Failed to save message templates");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setTemplates(defaultMessageTemplates);
    showInfo("Templates reset to defaults. Remember to save your changes.");
  };

  const handleWelcomeMessageChange = (message: string) => {
    setLocalWelcomeMessage(message);

    // Clear existing timeout
    if (welcomeMessageTimeout) {
      clearTimeout(welcomeMessageTimeout);
    }

    // Set new timeout for debounced update
    const newTimeout = setTimeout(() => {
      onUpdateWelcomeMessage(message);
    }, 1000); // 1 second delay

    setWelcomeMessageTimeout(newTimeout);
  };

  const updateTemplate = (
    templateType: keyof MessageTemplates,
    messageType: "whatsapp" | "push",
    value: string | { title: string; body: string }
  ) => {
    setTemplates((prev: MessageTemplates) => ({
      ...prev,
      [templateType]: {
        ...prev[templateType],
        [messageType]: value,
      },
    }));
  };

  const getCurrentTemplate = () => {
    const template = templates[activeTemplate];
    if (activeMessageType === "whatsapp") {
      return template.whatsapp;
    } else {
      return template.push;
    }
  };

  const generatePreview = () => {
    const template = getCurrentTemplate();
    if (activeMessageType === "whatsapp") {
      return processMessageTemplate(template as string, sampleData);
    } else {
      const pushTemplate = template as { title: string; body: string };
      return {
        title: processMessageTemplate(pushTemplate.title, sampleData),
        body: processMessageTemplate(pushTemplate.body, sampleData),
      };
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess("Copied to clipboard!");
  };

  const templateLabels = {
    ticketCreated: "Ticket Created",
    youAreNext: "You Are Next",
    yourTurn: "Your Turn",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Message Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Customer Welcome Experience
            </h2>
            <p className="text-sm text-gray-500">
              Welcome message displayed when customers first access your queue
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Welcome Message
          </label>
          <p className="text-sm text-gray-500 mb-3">
            This message will be displayed to customers when they first access
            the queue system
          </p>
          <textarea
            value={localWelcomeMessage}
            onChange={(e) => {
              if (canEditWelcomeMessage) {
                handleWelcomeMessageChange(e.target.value);
              }
            }}
            disabled={!canEditWelcomeMessage}
            rows={3}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none ${
              !canEditWelcomeMessage
                ? "bg-gray-50 cursor-not-allowed text-gray-700"
                : ""
            }`}
            placeholder="Welcome to our smart queue system. Please take your number and wait for your turn."
          />
          {!canEditWelcomeMessage && (
            <p className="text-xs text-gray-500 mt-2">
              You don't have permission to edit the welcome message. Contact
              your administrator.
            </p>
          )}
        </div>
      </div>

      {/* Message Templates Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Notification Message Templates
            </h2>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset to Defaults</span>
            </button>
            <button
              onClick={saveTemplates}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Saving..." : "Save Templates"}</span>
            </button>
          </div>
        </div>

        {/* Template Selection */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {(
                Object.keys(templateLabels) as Array<
                  keyof typeof templateLabels
                >
              ).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveTemplate(key)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTemplate === key
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {templateLabels[key]}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Message Type Selection */}
        <div className="mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveMessageType("whatsapp")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeMessageType === "whatsapp"
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
              }`}
            >
              WhatsApp Message
            </button>
            <button
              onClick={() => setActiveMessageType("push")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeMessageType === "push"
                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                  : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
              }`}
            >
              Push Notification
            </button>
          </div>
        </div>

        {/* Template Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Edit Template
            </h3>

            {activeMessageType === "whatsapp" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Message
                </label>
                <textarea
                  value={getCurrentTemplate() as string}
                  onChange={(e) =>
                    updateTemplate(activeTemplate, "whatsapp", e.target.value)
                  }
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Enter your WhatsApp message template..."
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Push Notification Title
                  </label>
                  <input
                    type="text"
                    value={
                      (getCurrentTemplate() as { title: string; body: string })
                        .title
                    }
                    onChange={(e) =>
                      updateTemplate(activeTemplate, "push", {
                        ...(getCurrentTemplate() as {
                          title: string;
                          body: string;
                        }),
                        title: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter push notification title..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Push Notification Body
                  </label>
                  <textarea
                    value={
                      (getCurrentTemplate() as { title: string; body: string })
                        .body
                    }
                    onChange={(e) =>
                      updateTemplate(activeTemplate, "push", {
                        ...(getCurrentTemplate() as {
                          title: string;
                          body: string;
                        }),
                        body: e.target.value,
                      })
                    }
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter push notification body..."
                  />
                </div>
              </div>
            )}

            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">
                Available Variables:
              </h4>
              <div className="text-xs text-yellow-700 grid grid-cols-2 gap-1">
                <code>{"{{organizationName}}"}</code>
                <code>{"{{ticketNumber}}"}</code>
                <code>{"{{serviceName}}"}</code>
                <code>{"{{departmentName}}"}</code>
                <code>{"{{estimatedWaitTime}}"}</code>
                <code>{"{{queuePosition}}"}</code>
                <code>{"{{totalInQueue}}"}</code>
                <code>{"{{currentlyServing}}"}</code>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Preview</h3>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <Eye className="h-4 w-4" />
                <span>{showPreview ? "Hide" : "Show"} Preview</span>
              </button>
            </div>

            {showPreview && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                {activeMessageType === "whatsapp" ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        WhatsApp Preview:
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(generatePreview() as string)
                        }
                        className="text-blue-600 hover:text-blue-800"
                        title="Copy WhatsApp preview to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="bg-white border rounded-lg p-3 whitespace-pre-wrap text-sm font-mono">
                      {generatePreview() as string}
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-medium text-gray-600 mb-2 block">
                      Push Notification Preview:
                    </span>
                    <div className="bg-white border rounded-lg p-3 space-y-2">
                      <div className="font-semibold text-sm">
                        {
                          (generatePreview() as { title: string; body: string })
                            .title
                        }
                      </div>
                      <div className="text-sm text-gray-600">
                        {
                          (generatePreview() as { title: string; body: string })
                            .body
                        }
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 text-sm text-gray-600">
              <p>
                <strong>Sample data used:</strong>
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>Organization: {sampleData.organizationName}</li>
                <li>Ticket: {sampleData.ticketNumber}</li>
                <li>Service: {sampleData.serviceName}</li>
                <li>Department: {sampleData.departmentName}</li>
                <li>
                  Queue Position: {sampleData.queuePosition} of{" "}
                  {sampleData.totalInQueue}
                </li>
                <li>Estimated Wait: {sampleData.estimatedWaitTime}</li>
                <li>Currently Serving: {sampleData.currentlyServing}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
