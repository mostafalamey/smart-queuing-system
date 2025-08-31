"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-fixed";
import { DynamicTheme } from "@/components/DynamicTheme";
import { notificationService } from "@/lib/notifications";
import { pushNotificationService } from "@/lib/pushNotifications";
import { pushSubscriptionManager } from "@/lib/pushSubscriptionManager";
import { queueNotificationHelper } from "@/lib/queueNotifications";
import { BrowserDetection, type BrowserInfo } from "@/lib/browserDetection";
import { URLPersistenceService } from "@/lib/urlPersistence";
import PWAInstallHelper from "@/components/PWAInstallHelper";
import PushNotificationPopup from "@/components/PushNotificationPopup";
import { OrganizationPhoneInput } from "@/components/OrganizationPhoneInput";
import { WhatsAppOptIn } from "@/components/WhatsAppOptIn";
import { logger } from "@/lib/logger";
import {
  defaultMessageTemplates,
  processMessageTemplate,
  getQueueStatistics,
  type MessageTemplateData,
  type MessageTemplates,
} from "../../../shared/message-templates";
import {
  Phone,
  ChevronRight,
  MapPin,
  Users,
  Clock,
  Bell,
  MessageCircle,
  Smartphone,
  BellOff,
  AlertTriangle,
  Info,
  ArrowLeft,
} from "lucide-react";

interface Organization {
  id: string;
  name: string;
  primary_color: string | null;
  logo_url: string | null;
  welcome_message: string | null;
}

interface Branch {
  id: string;
  name: string;
  address: string | null;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
  branch_id: string;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  estimated_time: number;
  department_id: string;
  is_active: boolean;
}

interface QueueStatus {
  currentServing: number | null;
  waitingCount: number;
  estimatedWaitTime: number;
}

function CustomerAppContent() {
  const searchParams = useSearchParams();

  // Enhanced URL parameter handling with persistence
  const urlParams = URLPersistenceService.getCurrentParams(searchParams);
  const orgId = urlParams.org;
  const branchId = urlParams.branch;
  const departmentId = urlParams.department;

  const [step, setStep] = useState(1); // 1: Phone, 2: Branch, 3: Department, 4: Service + Notifications, 5: Queue Join + Final Setup
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(branchId || "");
  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    departmentId || ""
  );
  const [selectedService, setSelectedService] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Notification preferences
  const [notificationPreference, setNotificationPreference] = useState<
    "push" | "whatsapp" | "both"
  >("push");
  const [notificationSetupStatus, setNotificationSetupStatus] = useState<
    "pending" | "setting_up" | "success" | "failed"
  >("pending");
  const [whatsappRetryCount, setWhatsappRetryCount] = useState(0);
  const [whatsappSessionCheckInterval, setWhatsappSessionCheckInterval] =
    useState<NodeJS.Timeout | null>(null);

  const [whatsappOptIn, setWhatsappOptIn] = useState<boolean>(false); // Keep for backward compatibility
  const [expectedTicketNumber, setExpectedTicketNumber] =
    useState<string>("SER-001");
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string>("");
  const [ticketId, setTicketId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] =
    useState(false);
  const [pushNotificationsSupported, setPushNotificationsSupported] =
    useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [pushSubscriptionLoading, setPushSubscriptionLoading] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [showBrowserWarning, setShowBrowserWarning] = useState(false);
  // Current notification for in-app popup display
  const [currentNotification, setCurrentNotification] = useState<{
    title: string;
    body: string;
    type: "ticket_created" | "almost_your_turn" | "your_turn" | "general";
    timestamp: number;
  } | null>(null);

  // Phone validation patterns for different countries
  const phoneValidationPatterns: {
    [key: string]: { pattern: RegExp; minLength: number };
  } = {
    "+20": { pattern: /^[0-9]{10}$/, minLength: 10 }, // Egypt: 10 digits
    "+1": { pattern: /^[0-9]{10}$/, minLength: 10 }, // US/Canada: 10 digits
    "+44": { pattern: /^[0-9]{10,11}$/, minLength: 10 }, // UK: 10-11 digits
    "+971": { pattern: /^[0-9]{8,9}$/, minLength: 8 }, // UAE: 8-9 digits
    "+966": { pattern: /^[0-9]{9}$/, minLength: 9 }, // Saudi Arabia: 9 digits
  };

  // Validate phone number based on pattern and ensure it has actual digits
  const isValidPhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber || !phoneNumber.trim()) {
      return false;
    }

    // Find country code in the phone number first
    const countryCode = Object.keys(phoneValidationPatterns).find((code) =>
      phoneNumber.startsWith(code)
    );

    if (!countryCode) {
      // Fallback validation for unknown countries - must be at least 8 digits after country code
      const digits = phoneNumber.replace(/^\+\d+/, "").replace(/\D/g, "");
      return digits.length >= 8;
    }

    // Extract local number (remove country code and spaces)
    const localNumber = phoneNumber
      .substring(countryCode.length)
      .replace(/\D/g, "");

    // Check if there are no local digits (only country code)
    if (!localNumber || localNumber.length === 0) {
      return false;
    }

    const validation = phoneValidationPatterns[countryCode];
    return validation.pattern.test(localNumber);
  };

  // Initialize browser detection and push notification listeners
  useEffect(() => {
    initializeBrowserDetection();
    setupPushMessageListener();

    // Try to restore push subscription if app was restarted
    if (orgId) {
      restoreSubscriptionOnAppStart();
    }
  }, []);

  // Initialize app and restore subscription after org is available
  useEffect(() => {
    if (orgId) {
      fetchOrganization();
      fetchBranches();
      restoreSubscriptionOnAppStart();
    }
  }, [orgId]);

  // Auto-redirect when notification setup is successful
  useEffect(() => {
    if (step === 5 && notificationSetupStatus === "success") {
      const timer = setTimeout(() => {
        setStep(6); // Move to confirmation step
      }, 2000); // Wait 2 seconds to show success message

      return () => clearTimeout(timer);
    }
  }, [step, notificationSetupStatus]);

  // Auto-trigger queue join when reaching step 5
  useEffect(() => {
    if (step === 5 && notificationSetupStatus === "pending") {
      console.log("🎯 Step 5 reached, auto-triggering queue join...");
      handleQueueJoinWithNotifications();
    }
  }, [step]);

  // Helper function to check if app is installed as PWA
  const isAppInstalled = (): boolean => {
    // Check if running in standalone mode (PWA)
    if (typeof window !== "undefined") {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        window.location.search.includes("utm_source=pwa")
      );
    }
    return false;
  };

  // Function to restore subscription when app starts
  const restoreSubscriptionOnAppStart = async () => {
    if (!orgId) return;

    try {
      logger.debug("Checking for stored subscription to restore...");

      // Check if we have a stored active subscription
      const storedInfo = pushSubscriptionManager.getStoredSubscriptionInfo();
      if (storedInfo && storedInfo.organizationId === orgId) {
        logger.debug("Found stored subscription, attempting to restore...", {
          ticketId: storedInfo.ticketId,
          organizationId: storedInfo.organizationId,
        });

        // Initialize push service first
        const initialized = await pushNotificationService.initialize();
        if (!initialized) {
          logger.log(
            "Push service initialization failed, clearing stored subscription"
          );
          pushSubscriptionManager.clearStoredSubscription();
          return;
        }

        // Attempt to restore subscription
        const restored =
          await pushSubscriptionManager.restoreSubscriptionOnStartup(orgId);
        if (restored) {
          logger.log(
            "Successfully restored push subscription after app restart"
          );
          setPushNotificationsEnabled(true);

          // Set ticket info if we have it
          setTicketId(storedInfo.ticketId);
          // Note: ticket number would need to be fetched from server if needed
        } else {
          logger.log(
            "Failed to restore subscription - ticket may no longer exist"
          );
        }
      }
    } catch (error) {
      logger.error("Error restoring subscription on app start:", error);
    }
  };

  useEffect(() => {
    if (branchId) {
      setSelectedBranch(branchId);
      // Update stored parameters
      URLPersistenceService.updateStoredParams(orgId, branchId, departmentId);
      // Don't change step - keep at step 1 for phone number entry
      // The branch is just pre-selected for later use
    }
  }, [branchId, orgId, departmentId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedBranch) {
      fetchDepartments();
    }
  }, [selectedBranch]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedDepartment) {
      fetchServices();
    }
  }, [selectedDepartment]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedService) {
      fetchQueueStatus();
    }
  }, [selectedService]);

  // Polling for ticket status changes to show notifications
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ticketNumber && ticketId && pushNotificationsEnabled) {
      const interval = setInterval(async () => {
        await checkTicketStatusForNotifications();
      }, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
    }
  }, [ticketNumber, ticketId, pushNotificationsEnabled]);

  // Initialize browser detection only (no permission request)
  const initializeBrowserDetection = async () => {
    try {
      // Get detailed browser information
      const browserInfo = BrowserDetection.getBrowserInfo();
      setBrowserInfo(browserInfo);

      logger.debug("Browser detection:", browserInfo);

      // Set support based on detailed detection
      setPushNotificationsSupported(browserInfo.isSupported);

      // Show warning ONLY for unsupported browsers, not limited support
      if (!browserInfo.isSupported) {
        setShowBrowserWarning(true);
      }
    } catch (error) {
      logger.error("Error detecting browser capabilities:", error);
    }
  };

  // Setup listener for push messages received while app is open
  const setupPushMessageListener = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "PUSH_NOTIFICATION") {
          const { title, body, data } = event.data.payload;

          // Determine notification type from data
          const notificationType = data?.notificationType || "general";

          // Show in-app popup
          setCurrentNotification({
            title,
            body,
            type: notificationType as
              | "ticket_created"
              | "almost_your_turn"
              | "your_turn"
              | "general",
            timestamp: Date.now(),
          });
        }
      });
    }
  };

  // Check ticket status for in-app notifications when status changes
  const checkTicketStatusForNotifications = useCallback(async () => {
    if (!ticketNumber || !selectedService || !ticketId) return;

    try {
      // Get current ticket status using ticket ID instead of phone
      const { data: ticket, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", ticketId)
        .single();

      if (error || !ticket) return;

      // Get queue position
      const { data: queueData } = await supabase
        .from("tickets")
        .select("ticket_number")
        .eq("service_id", selectedService)
        .eq("status", "waiting")
        .order("created_at", { ascending: true });

      const queuePosition = queueData
        ? queueData.findIndex((t) => t.ticket_number === ticketNumber) + 1
        : 0;

      // Show notifications based on status and position
      if (ticket.status === "serving") {
        setCurrentNotification({
          title: "Your Turn Now!",
          body: `Please proceed to the service counter. Ticket ${ticketNumber} is being served.`,
          type: "your_turn",
          timestamp: Date.now(),
        });
      } else if (queuePosition === 1 && ticket.status === "waiting") {
        setCurrentNotification({
          title: "You're Next!",
          body: `You are next in line! Please be ready. Ticket ${ticketNumber}`,
          type: "almost_your_turn",
          timestamp: Date.now(),
        });
      } else if (
        queuePosition <= 3 &&
        queuePosition > 1 &&
        ticket.status === "waiting"
      ) {
        setCurrentNotification({
          title: "Almost Your Turn",
          body: `You are ${queuePosition} in line. Please stay nearby. Ticket ${ticketNumber}`,
          type: "almost_your_turn",
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      logger.error("Error checking ticket status for notifications:", error);
    }
  }, [ticketNumber, selectedService, phoneNumber]);

  const fetchOrganization = useCallback(async () => {
    if (!orgId) return;

    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();

      if (error) {
        logger.error("Error fetching organization:", error);
        return;
      }

      setOrganization(data);
    } catch (error) {
      logger.error("Exception fetching organization:", error);
    }
  }, [orgId]);

  const fetchBranches = useCallback(async () => {
    if (!orgId) return;

    try {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("organization_id", orgId);

      if (error) {
        logger.error("Error fetching branches:", error);
        setBranches([]);
        return;
      }

      setBranches(data || []);
    } catch (error) {
      logger.error("Exception fetching branches:", error);
      setBranches([]);
    }
  }, [orgId]);

  const fetchDepartments = useCallback(async () => {
    if (!selectedBranch) return;

    try {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("branch_id", selectedBranch);

      if (error) {
        logger.error("Error fetching departments:", error);
        setDepartments([]);
        return;
      }

      setDepartments(data || []);
    } catch (error) {
      logger.error("Exception fetching departments:", error);
      setDepartments([]);
    }
  }, [selectedBranch]);

  const fetchServices = useCallback(async () => {
    if (!selectedDepartment) return;

    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("department_id", selectedDepartment)
        .eq("is_active", true)
        .order("name");

      if (error) {
        logger.error("Error fetching services:", error);
        setServices([]);
        return;
      }

      setServices(data || []);
    } catch (error) {
      logger.error("Exception fetching services:", error);
      setServices([]);
    }
  }, [selectedDepartment]);

  const fetchQueueStatus = useCallback(async () => {
    if (!selectedService) return;

    try {
      // Get service details for estimated time
      const { data: serviceData } = await supabase
        .from("services")
        .select("estimated_time")
        .eq("id", selectedService)
        .single();

      // Get queue status from tickets
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact" })
        .eq("service_id", selectedService)
        .eq("status", "waiting");

      // Get currently serving ticket
      const { data: servingTickets } = await supabase
        .from("tickets")
        .select("ticket_number")
        .eq("service_id", selectedService)
        .eq("status", "serving")
        .limit(1);

      const servingTicket = servingTickets?.[0] || null;

      const estimatedTime = serviceData?.estimated_time || 10; // Default 10 minutes
      setQueueStatus({
        currentServing: servingTicket?.ticket_number || null,
        waitingCount: count || 0,
        estimatedWaitTime: (count || 0) * estimatedTime,
      });
    } catch (error) {
      logger.error("Error fetching queue status:", error);
      // Fallback to basic count only
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact" })
        .eq("department_id", selectedDepartment)
        .eq("status", "waiting");

      setQueueStatus({
        currentServing: null,
        waitingCount: count || 0,
        estimatedWaitTime: (count || 0) * 5,
      });
    }
  }, [selectedService, selectedDepartment]);

  // Function to generate expected ticket number for preview
  const getExpectedTicketNumber = async (
    serviceId: string
  ): Promise<string> => {
    try {
      // Get service details
      const { data: service } = await supabase
        .from("services")
        .select("name")
        .eq("id", serviceId)
        .single();

      if (!service) return "SER-001";

      // Get the last ticket number for this service
      const { data: lastTicket } = await supabase
        .from("tickets")
        .select("ticket_number")
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const servicePrefix = service.name.substring(0, 3).toUpperCase();
      let lastNumber = 0;

      if (lastTicket?.ticket_number) {
        const match = lastTicket.ticket_number.match(/\d+$/);
        if (match) {
          lastNumber = parseInt(match[0]);
        }
      }

      const nextNumber = lastNumber + 1;
      return `${servicePrefix}-${nextNumber.toString().padStart(3, "0")}`;
    } catch (error) {
      logger.error("Error generating expected ticket number:", error);
      return "SER-001";
    }
  };

  // Function to load organization's custom message templates
  const loadOrganizationTemplates = async (
    organizationId: string
  ): Promise<MessageTemplates> => {
    try {
      console.log("🔍 Loading templates for organization:", organizationId);

      const { data: customTemplates, error } = await supabase
        .from("message_templates")
        .select("templates")
        .eq("organization_id", organizationId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found
        console.error("❌ Error loading templates:", error);
        throw error;
      }

      if (customTemplates?.templates) {
        console.log("✅ Found custom templates:", customTemplates.templates);
        return customTemplates.templates as MessageTemplates;
      }

      // Return default templates if no custom ones found
      console.log("⚠️ No custom templates found, using defaults");
      return defaultMessageTemplates;
    } catch (error) {
      console.error("❌ Error loading organization templates:", error);
      return defaultMessageTemplates;
    }
  };

  // WhatsApp session retry logic with shorter timeouts for production
  const checkWhatsAppSessionWithRetry = async (
    phone: string,
    maxRetries: number = 3
  ): Promise<boolean> => {
    console.log(
      "🔄 checkWhatsAppSessionWithRetry starting for phone:",
      phone,
      "maxRetries:",
      maxRetries
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔍 Attempt ${attempt}/${maxRetries} - checking for WhatsApp session...`
        );
        setWhatsappRetryCount(attempt);

        // Create AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001"
          }/api/whatsapp/check-session`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              phone: phone,
              organizationId: orgId,
            }),
            signal: controller.signal, // Add timeout support
          }
        );

        clearTimeout(timeoutId); // Clear timeout if request completes
        const data = await response.json();

        console.log(`📋 Session check result (attempt ${attempt}):`, data);

        if (data.success && data.hasActiveSession) {
          console.log(`✅ WhatsApp session found on attempt ${attempt}`);
          logger.info(`WhatsApp session found on attempt ${attempt}`);
          return true;
        }

        // If not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const waitTime = attempt === 1 ? 3000 : 5000; // Shorter wait for first retry
          console.log(
            `⏰ Session not found, waiting ${
              waitTime / 1000
            } seconds before retry ${attempt + 1}...`
          );
          logger.info(
            `WhatsApp session not found, retrying in ${
              waitTime / 1000
            } seconds... (${attempt}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      } catch (error: any) {
        console.error(`❌ Session check attempt ${attempt} failed:`, error);

        // Check if it's a timeout error
        if (error.name === "AbortError") {
          console.log(`⏰ Timeout on attempt ${attempt}`);
          logger.warn(`WhatsApp session check timed out on attempt ${attempt}`);
        } else {
          logger.error(
            `WhatsApp session check attempt ${attempt} failed:`,
            error
          );
        }

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Shorter retry delay
        }
      }
    }

    console.log("❌ All retry attempts failed");
    return false;
  };

  // New function to handle queue join + notification setup
  const handleQueueJoinWithNotifications = async () => {
    if (!selectedService) {
      logger.error("Cannot join queue: no service selected");
      return;
    }

    console.log(
      "🚀 Starting queue join with notifications. Preference:",
      notificationPreference
    );
    setLoading(true);
    setNotificationSetupStatus("setting_up");

    try {
      // Step 1: Create the ticket first
      console.log("📝 Creating ticket...");
      const newTicket = await createTicketInQueue();
      console.log("✅ Ticket created successfully:", newTicket.id);

      // Wait a moment for state to update
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Step 2: Always update notification preferences first
      console.log(
        "⚙️ Updating notification preferences to:",
        notificationPreference
      );
      await updateNotificationPreferences(notificationPreference);

      // Step 3: Handle notifications based on preference
      if (
        notificationPreference === "whatsapp" ||
        notificationPreference === "both"
      ) {
        console.log("💬 Setting up WhatsApp notifications...");
        await handleWhatsAppNotificationSetup();
        console.log("✅ WhatsApp setup completed");

        // Now send the ticket creation WhatsApp notification since session is activated
        console.log("💬 Sending WhatsApp ticket creation notification...");
        try {
          // Get comprehensive service and organization data
          const { data: serviceWithDept } = await supabase
            .from("services")
            .select(
              `
              name,
              department:department_id (
                id,
                name
              )
            `
            )
            .eq("id", selectedService)
            .single();

          const serviceName = serviceWithDept?.name || "Selected Service";
          const departmentName =
            (serviceWithDept?.department as any)?.name || "Department";

          // Get queue statistics
          const queueStats = await getQueueStatistics(
            selectedService,
            supabase
          );

          // Prepare message template data
          const templateData: MessageTemplateData = {
            organizationName: organization?.name || "Our Organization",
            ticketNumber: newTicket.ticket_number || "N/A",
            serviceName,
            departmentName,
            estimatedWaitTime: queueStats.estimatedWaitTime,
            queuePosition: queueStats.queuePosition,
            totalInQueue: queueStats.totalInQueue,
            currentlyServing: queueStats.currentlyServing,
          };

          // Load organization's custom message templates
          const orgTemplates = orgId
            ? await loadOrganizationTemplates(orgId)
            : defaultMessageTemplates;
          console.log(
            "📝 Using templates for WhatsApp:",
            orgTemplates.ticketCreated.whatsapp
          );

          // Generate WhatsApp message using custom or default template
          const whatsappMessage = processMessageTemplate(
            orgTemplates.ticketCreated.whatsapp,
            templateData
          );
          console.log("📱 Generated WhatsApp message:", whatsappMessage);

          const whatsappResponse = await fetch(
            `${process.env.NEXT_PUBLIC_ADMIN_URL}/api/notifications/whatsapp`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                phone: phoneNumber,
                message: whatsappMessage,
                organizationId: orgId,
                ticketId: newTicket.id,
                notificationType: "ticket_created",
              }),
            }
          );

          if (whatsappResponse.ok) {
            console.log(
              "✅ WhatsApp ticket creation notification sent successfully"
            );
          } else {
            console.log(
              "⚠️ Failed to send WhatsApp ticket creation notification:",
              await whatsappResponse.text()
            );
          }
        } catch (error) {
          console.error(
            "❌ Error sending WhatsApp ticket creation notification:",
            error
          );
        }
      }

      if (
        notificationPreference === "push" ||
        notificationPreference === "both"
      ) {
        console.log("🔔 Setting up push notifications...");
        // Pass the ticket ID directly instead of relying on state
        await handlePushNotificationSetup(newTicket.id);
        console.log("✅ Push setup completed");
      }

      console.log("🎉 All notifications setup completed successfully");
      setNotificationSetupStatus("success");
    } catch (error) {
      console.error("❌ Error in queue join with notifications:", error);
      logger.error("Error in queue join with notifications:", error);

      // Don't fail completely - still show success if ticket was created
      if (ticketNumber && ticketId) {
        console.log(
          "✅ Ticket was created successfully, marking as success despite notification issues"
        );
        setNotificationSetupStatus("success");
      } else {
        setNotificationSetupStatus("failed");
      }
    } finally {
      setLoading(false);
    }
  };

  // Separate ticket creation logic
  const createTicketInQueue = async () => {
    if (!selectedService) {
      throw new Error("No service selected");
    }

    logger.debug("createTicketInQueue starting with:", {
      phoneNumber,
      selectedService,
      selectedDepartment,
      organizationId: organization?.id,
    });

    // Get service details with department info
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select(
        `
        *,
        department:department_id (
          id,
          name
        )
      `
      )
      .eq("id", selectedService)
      .single();

    logger.debug("Service query result:", { service, serviceError });

    if (serviceError || !service) {
      throw new Error("Service not found");
    }

    // Get last ticket number for this service
    const { data: lastTicket } = await supabase
      .from("tickets")
      .select("ticket_number")
      .eq("service_id", selectedService)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Generate ticket number
    const servicePrefix = service.name.substring(0, 3).toUpperCase();
    let lastNumber = 0;

    if (lastTicket?.ticket_number) {
      const match = lastTicket.ticket_number.match(/\d+$/);
      if (match) {
        lastNumber = parseInt(match[0]);
      }
    }

    const newTicketNumber = lastNumber + 1;
    const ticketNumberString = `${servicePrefix}-${newTicketNumber
      .toString()
      .padStart(3, "0")}`;

    logger.debug("About to create ticket with data:", {
      service_id: selectedService,
      department_id: service.department_id,
      ticket_number: ticketNumberString,
      customer_phone: phoneNumber,
      status: "waiting",
    });

    // Create the ticket
    const { data: newTicket, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        service_id: selectedService,
        department_id: service.department_id,
        ticket_number: ticketNumberString,
        customer_phone: phoneNumber || null,
        status: "waiting",
      })
      .select()
      .single();

    logger.debug("Ticket creation result:", { newTicket, ticketError });

    if (ticketError) {
      logger.error("Error creating ticket:", ticketError);
      throw ticketError;
    }

    // Store ticket information
    setTicketNumber(ticketNumberString);
    setTicketId(newTicket.id);

    // Show in-app notification for ticket creation
    const queueStatsForInApp = await getQueueStatistics(
      selectedService,
      supabase
    );
    const inAppTemplateData: MessageTemplateData = {
      organizationName: organization?.name || "Our Organization",
      ticketNumber: ticketNumberString,
      serviceName: service.name,
      departmentName: (service.department as any)?.name || "Department",
      estimatedWaitTime: queueStatsForInApp.estimatedWaitTime,
      queuePosition: queueStatsForInApp.queuePosition,
      totalInQueue: queueStatsForInApp.totalInQueue,
      currentlyServing: queueStatsForInApp.currentlyServing,
    };

    // Load organization templates for in-app notification
    const orgTemplatesForInApp = orgId
      ? await loadOrganizationTemplates(orgId)
      : defaultMessageTemplates;

    const inAppTitle = processMessageTemplate(
      orgTemplatesForInApp.ticketCreated.push.title,
      inAppTemplateData
    );
    const inAppBody = processMessageTemplate(
      orgTemplatesForInApp.ticketCreated.push.body,
      inAppTemplateData
    );

    setCurrentNotification({
      title: inAppTitle,
      body: inAppBody,
      type: "ticket_created",
      timestamp: Date.now(),
    });

    // Send push notification for ticket creation if push notifications are enabled OR user wants push notifications
    try {
      if (
        (pushNotificationsEnabled ||
          notificationPreference === "push" ||
          notificationPreference === "both") &&
        phoneNumber
      ) {
        console.log("📱 Sending ticket creation push notification...");

        // Get queue statistics for push notification
        const queueStats = await getQueueStatistics(selectedService, supabase);

        // Prepare message template data
        const templateData: MessageTemplateData = {
          organizationName: organization?.name || "Our Organization",
          ticketNumber: ticketNumberString,
          serviceName: service.name,
          departmentName: (service.department as any)?.name || "Department",
          estimatedWaitTime: queueStats.estimatedWaitTime,
          queuePosition: queueStats.queuePosition,
          totalInQueue: queueStats.totalInQueue,
          currentlyServing: queueStats.currentlyServing,
        };

        // Load organization's custom message templates for push notification
        const orgTemplatesForPush = orgId
          ? await loadOrganizationTemplates(orgId)
          : defaultMessageTemplates;
        console.log(
          "📝 Using templates for Push:",
          orgTemplatesForPush.ticketCreated.push
        );

        // Generate push notification messages using custom templates
        const pushTitle = processMessageTemplate(
          orgTemplatesForPush.ticketCreated.push.title,
          templateData
        );
        const pushBody = processMessageTemplate(
          orgTemplatesForPush.ticketCreated.push.body,
          templateData
        );
        console.log("🔔 Generated push notification:", {
          title: pushTitle,
          body: pushBody,
        });

        const pushResponse = await fetch(
          `${process.env.NEXT_PUBLIC_ADMIN_URL}/api/notifications/push`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              organizationId: orgId,
              ticketId: newTicket.id,
              customerPhone: phoneNumber,
              payload: {
                title: pushTitle,
                body: pushBody,
                icon: "/icon-192x192.png",
                badge: "/badge-72x72.png",
                data: {
                  ticketId: newTicket.id,
                  ticketNumber: ticketNumberString,
                  action: "ticket_created",
                },
              },
              notificationType: "ticket_created",
              ticketNumber: ticketNumberString,
            }),
          }
        );

        if (pushResponse.ok) {
          console.log("✅ Ticket creation push notification sent successfully");
        } else {
          console.log(
            "⚠️ Failed to send ticket creation push notification:",
            await pushResponse.text()
          );
        }
      } else {
        console.log(
          "ℹ️ Skipping ticket creation push notification - not requested or no phone number"
        );
      }
    } catch (error) {
      console.error(
        "❌ Error sending ticket creation push notification:",
        error
      );
      // Don't throw - push notification failure shouldn't break ticket creation
    }

    // Send WhatsApp notification for ticket creation if there's an active WhatsApp session
    // NOTE: This is moved to handleQueueJoinWithNotifications() to run AFTER session setup
    // Keeping this comment here for clarity about the flow

    // Refresh queue status
    fetchQueueStatus();

    return newTicket;
  };

  // Handle WhatsApp notification setup with retry logic
  const handleWhatsAppNotificationSetup = async () => {
    if (!phoneNumber) {
      console.log("❌ No phone number provided for WhatsApp setup");
      return;
    }

    console.log("💬 Starting WhatsApp setup for phone:", phoneNumber);

    try {
      // First, create a session record
      console.log("📝 Creating WhatsApp session record...");
      const sessionResponse = await fetch(`/api/whatsapp/create-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phoneNumber,
          organizationId: orgId,
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error("Failed to create WhatsApp session record");
      }

      const sessionData = await sessionResponse.json();
      console.log("✅ Session record created:", sessionData.sessionId);

      // Then, open WhatsApp for the user to send the message (in new tab)
      const whatsappUrl = `https://wa.me/201015544028?text=${encodeURIComponent(
        "Hello"
      )}`;
      console.log("📱 Opening WhatsApp in new tab with URL:", whatsappUrl);

      const newWindow = window.open(whatsappUrl, "_blank");
      if (!newWindow) {
        console.log("⚠️ Popup blocked, showing manual link");
        // Popup was blocked, show user a manual link
        const openManually = confirm(
          'Please click OK to open WhatsApp in a new tab and send "Hello" to complete setup.\n\nIf WhatsApp doesn\'t open automatically, you may need to allow popups for this site.'
        );
        if (openManually) {
          // Open in new tab instead of replacing current page
          window.open(whatsappUrl, "_blank");
        }
      }

      // Wait a bit for the user to switch to WhatsApp and send message
      console.log("⏳ Waiting 3 seconds for user to send WhatsApp message...");
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Then retry checking for session activation with timeout
      console.log("🔄 Starting session activation check with retry logic...");

      // Check for session activation (simplified - no race condition needed)
      const sessionActivated = await checkWhatsAppSessionWithRetry(
        phoneNumber,
        2
      ); // Reduced to 2 retries

      if (sessionActivated) {
        setWhatsappOptIn(true);
        console.log("✅ WhatsApp session activated successfully");
        logger.info("WhatsApp session activated successfully");
      } else {
        console.log(
          "⚠️ WhatsApp session not activated - continuing with fallback"
        );
        logger.warn(
          "WhatsApp session setup failed or timed out - using fallback"
        );
        // Don't throw error - allow user to continue without WhatsApp
        setWhatsappOptIn(false);
      }
    } catch (error) {
      console.error("❌ WhatsApp setup failed:", error);
      logger.error("WhatsApp setup failed:", error);
      // Don't throw error - allow user to continue
      console.log("⚠️ WhatsApp setup failed, but allowing user to continue");
      setWhatsappOptIn(false);
    }
  };

  // Update notification preferences in database
  const updateNotificationPreferences = async (
    preference: "push" | "whatsapp" | "both"
  ) => {
    if (!phoneNumber || !orgId) {
      console.log("⚠️ Cannot update preferences - missing phone or orgId");
      return;
    }

    try {
      console.log(
        "📝 Updating notification preferences in database:",
        preference
      );

      // Call the subscribe API to update preferences (even for WhatsApp-only)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_ADMIN_URL}/api/notifications/subscribe`,
        {
          method: "PUT", // Use PUT method to update preferences
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            organizationId: orgId,
            customerPhone: phoneNumber,
            pushDenied: preference === "whatsapp", // Push is denied only for WhatsApp-only
            notificationPreference: preference,
          }),
        }
      );

      if (response.ok) {
        console.log("✅ Notification preferences updated successfully");
      } else {
        console.log(
          "⚠️ Failed to update notification preferences:",
          await response.text()
        );
      }
    } catch (error) {
      console.error("❌ Error updating notification preferences:", error);
      // Don't throw - preference update failure shouldn't block queue join
    }
  };

  // Handle push notification setup
  const handlePushNotificationSetup = async (overrideTicketId?: string) => {
    const currentTicketId = overrideTicketId || ticketId;

    if (!currentTicketId || !orgId) {
      console.log("⚠️ Push setup skipped - missing ticketId or orgId:", {
        ticketId: currentTicketId,
        orgId,
      });
      return;
    }

    console.log(
      "🔔 Starting push notification setup with ticketId:",
      currentTicketId
    );

    try {
      // Check if permission is already granted
      if (Notification.permission === "granted") {
        console.log(
          "✅ Notification permission already granted, proceeding..."
        );
      } else if (Notification.permission === "default") {
        console.log("🔔 Requesting notification permission...");
        const permission = await Notification.requestPermission();
        console.log("🔐 Notification permission result:", permission);

        if (permission !== "granted") {
          console.log("❌ Notification permission denied:", permission);
          return;
        }
      } else {
        console.log("❌ Notification permission previously denied");
        return;
      }

      console.log("🔔 Initializing push notification service...");
      const initialized = await pushNotificationService.initialize();

      if (initialized) {
        console.log("📱 Creating subscription with phone:", phoneNumber);
        const subscription = await pushNotificationService.subscribeWithPhone(
          orgId,
          phoneNumber!,
          notificationPreference // Pass the user's notification preference
        );
        console.log("📋 Subscription creation result:", !!subscription);

        if (subscription && currentTicketId) {
          console.log(
            "🔗 Associating subscription with ticket:",
            currentTicketId
          );
          await pushNotificationService.associateSubscriptionWithTicket(
            currentTicketId
          );

          setPushNotificationsEnabled(true);
          console.log("✅ Push notifications fully enabled");
          logger.info("Push notifications enabled successfully");
        } else {
          console.log("❌ Subscription creation failed");
        }
      } else {
        console.log("❌ Push service initialization failed");
      }
    } catch (error) {
      console.error("❌ Push notification setup failed:", error);
      logger.error("Push notification setup failed:", error);
      // Don't throw - push failure shouldn't block queue join
    }
  };

  const joinQueue = async () => {
    if (!selectedService) {
      logger.debug("joinQueue validation failed:", {
        phoneNumber,
        selectedService,
      });
      return;
    }

    logger.debug("joinQueue starting with:", {
      phoneNumber,
      selectedService,
      selectedDepartment,
      organizationId: organization?.id,
    });

    setLoading(true);
    try {
      // Get service details
      const { data: service, error: serviceError } = await supabase
        .from("services")
        .select(
          `
          *,
          department:department_id (
            id,
            name
          )
        `
        )
        .eq("id", selectedService)
        .single();

      logger.debug("Service query result:", { service, serviceError });

      if (serviceError || !service) {
        throw new Error("Service not found");
      }

      // Get the next ticket number for this service
      const { data: lastTicket } = await supabase
        .from("tickets")
        .select("ticket_number")
        .eq("service_id", selectedService)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // Generate ticket number: SERVICE_NAME-XXX
      const servicePrefix = service.name.substring(0, 3).toUpperCase();
      let lastNumber = 0;

      if (lastTicket?.ticket_number) {
        const match = lastTicket.ticket_number.match(/\d+$/);
        if (match) {
          lastNumber = parseInt(match[0]);
        }
      }

      const newTicketNumber = lastNumber + 1;
      const ticketNumberString = `${servicePrefix}-${newTicketNumber
        .toString()
        .padStart(3, "0")}`;

      logger.debug("About to create ticket with data:", {
        service_id: selectedService,
        department_id: service.department_id,
        ticket_number: ticketNumberString,
        customer_phone: phoneNumber,
        status: "waiting",
      });

      // Create the ticket
      const { data: newTicket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          service_id: selectedService,
          department_id: service.department_id,
          ticket_number: ticketNumberString,
          customer_phone: phoneNumber || null, // Make phone optional
          status: "waiting",
        })
        .select()
        .single();

      logger.debug("Ticket creation result:", { newTicket, ticketError });

      if (ticketError) {
        logger.error("Error creating ticket:", ticketError);
        throw ticketError;
      }

      // Store ticket information
      setTicketNumber(ticketNumberString);
      setTicketId(newTicket.id);

      // Associate pending push subscription with the new ticket ID
      if (pushNotificationsEnabled) {
        try {
          await pushNotificationService.associateSubscriptionWithTicket(
            newTicket.id
          );
          logger.debug(
            "Push subscription associated with ticket:",
            newTicket.id
          );

          // Store subscription info for app restart recovery
          const subscription =
            await pushNotificationService.getCurrentSubscription();
          if (subscription && orgId) {
            await pushSubscriptionManager.storeActiveSubscription(
              orgId,
              newTicket.id,
              subscription.endpoint
            );
            logger.debug("Subscription info stored for recovery");
          }
        } catch (error) {
          logger.error(
            "Error associating push subscription with ticket:",
            error
          );
        }
      }

      setStep(6); // Move to confirmation step

      // Show in-app notification for ticket creation
      setCurrentNotification({
        title: "Ticket Created Successfully!",
        body: `Your ticket ${ticketNumberString} has been created. You are in the queue for ${service.name}.`,
        type: "ticket_created",
        timestamp: Date.now(),
      });

      // Refresh queue status
      fetchQueueStatus();

      // Show push notification prompt ONLY if:
      // 1. Push notifications are supported
      // 2. Not already enabled
      // 3. App is installed as PWA (not just browser)
      if (
        pushNotificationsSupported &&
        !pushNotificationsEnabled &&
        isAppInstalled()
      ) {
        setShowPushPrompt(true);
      }

      // Send notifications
      const selectedServiceData = services.find(
        (s) => s.id === selectedService
      );
      const department = departments.find(
        (d) => d.id === selectedServiceData?.department_id
      );

      if (selectedServiceData && department && organization) {
        let pushSent = false;

        // Try push notification if enabled (using ticket ID)
        if (pushNotificationsEnabled && orgId) {
          try {
            pushSent =
              await queueNotificationHelper.sendTicketCreatedNotification({
                organizationId: orgId,
                ticketId: newTicket.id, // Use ticket ID instead of phone
                customerPhone: phoneNumber || null, // Make phone optional
                ticketNumber: ticketNumberString,
                departmentName: department.name,
                organizationName: organization.name,
                organizationLogo: organization.logo_url || undefined,
                organizationColor: organization.primary_color || undefined,
                waitingCount: queueStatus?.waitingCount || 0,
              });
          } catch (error) {
            logger.error("Push notification failed:", error);
          }
        }

        // Send WhatsApp notification if user opted in (ALWAYS send if opted in, regardless of push status)
        if (whatsappOptIn && phoneNumber) {
          try {
            await notificationService.notifyTicketCreated(
              phoneNumber,
              ticketNumberString,
              `${department.name} - ${selectedServiceData.name}`,
              organization.name,
              queueStatus?.waitingCount || 0,
              orgId || undefined, // organizationId
              newTicket.id // ticketId
            );
            logger.log("WhatsApp notification sent successfully");
          } catch (error) {
            logger.error("WhatsApp notification failed:", error);
          }
        }
      }
    } catch (error) {
      logger.error("Error joining queue:", error);
    } finally {
      setLoading(false);
    }
  };

  // Enable push notifications - ONLY when user explicitly opts in
  const enablePushNotifications = async () => {
    setPushSubscriptionLoading(true);

    if (!orgId) {
      logger.error("Organization ID is required for push notifications");
      setPushSubscriptionLoading(false);
      return;
    }

    // Only allow push notifications for installed PWAs
    if (!isAppInstalled()) {
      logger.error("Push notifications only available for installed PWAs");
      setPushSubscriptionLoading(false);
      return;
    }

    try {
      logger.debug("User explicitly opted in to push notifications:", {
        organizationId: orgId,
        platform: browserInfo?.platform,
        browser: browserInfo?.browser,
        supportLevel: browserInfo?.supportLevel,
        isInstalled: isAppInstalled(),
      });

      // For iOS Safari, add a small delay to ensure user interaction is processed
      if (
        browserInfo?.platform === "iOS" &&
        browserInfo?.browser === "Safari"
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Create phone-based subscription immediately when user opts in
      const subscription = await pushNotificationService.subscribeWithPhone(
        orgId,
        phoneNumber
      );

      if (subscription) {
        setPushNotificationsEnabled(true);
        setShowPushPrompt(false);
        logger.log(
          "Phone-based push subscription created successfully after user opt-in"
        );
      } else {
        logger.debug("Phone-based push notification subscription failed");
        // Still hide the prompt even if failed, so user can proceed with WhatsApp fallback
        setShowPushPrompt(false);
      }
    } catch (error) {
      logger.error("Error enabling push notifications:", error);
      // Hide prompt on error so user can proceed
      setShowPushPrompt(false);
    } finally {
      setPushSubscriptionLoading(false);
    }
  }; // Dismiss push notification prompt
  const dismissPushPrompt = () => {
    setShowPushPrompt(false);
  };

  const handleContinue = async () => {
    console.log(
      "🔍 handleContinue called. Current step:",
      step,
      "Selected service:",
      selectedService,
      "Notification preference:",
      notificationPreference
    );

    if (step === 1) {
      // Validate phone number is provided and valid (now mandatory)
      if (!isValidPhoneNumber(phoneNumber)) {
        logger.debug("Valid phone number is required");
        return;
      }

      // Skip push notification setup here - we'll handle it in step 5
      // Just move to the next step
      if (branchId && departmentId) {
        setStep(4); // Skip branch and department selection if both are pre-selected
      } else if (branchId) {
        setStep(3); // Skip branch selection if branch is pre-selected
      } else {
        setStep(2);
      }
    } else if (step === 2 && selectedBranch) {
      console.log("➡️ Moving from step 2 to step 3");
      setStep(3);
    } else if (step === 4 && selectedService && notificationPreference) {
      console.log(
        "➡️ Moving from step 4 to step 5 with preference:",
        notificationPreference
      );
      setStep(5); // Move to queue join + notification setup
    } else if (step === 5) {
      console.log("🚀 Step 5: Calling handleQueueJoinWithNotifications");
      try {
        await handleQueueJoinWithNotifications(); // New function to handle both
      } catch (error) {
        console.error("❌ Step 5 error:", error);
        logger.error("Step 5 error:", error);
        setNotificationSetupStatus("failed");
        setLoading(false);
      }
    } else {
      console.log(
        "⚠️ handleContinue: No matching condition. Step:",
        step,
        "Conditions:",
        {
          step2: step === 2 && selectedBranch,
          step4: step === 4 && selectedService && notificationPreference,
          step5: step === 5,
        }
      );
    }
  };

  const handleGoBack = () => {
    if (step > 1) {
      setStep(step - 1);
      // Clear selections when going back
      if (step === 4) {
        setSelectedService("");
        setNotificationPreference("push");
        setExpectedTicketNumber("");
      } else if (step === 3) {
        setSelectedDepartment("");
      } else if (step === 2) {
        setSelectedBranch("");
      }
    }
  };

  const brandColor = organization?.primary_color || "#3b82f6";

  return (
    <DynamicTheme brandColor={brandColor}>
      <div className="container mx-auto px-4 py-8 max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-16 h-16 border-4 border-white/40 rounded-xl flex items-center justify-center p-1">
              {organization?.logo_url ? (
                <img
                  src={organization.logo_url}
                  alt={organization.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src="/Logo.svg"
                  alt="Smart Queue Logo"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            <h1 className="text-xl font-bold text-white">
              {organization?.name || "Smart Queue"}
            </h1>
          </div>
        </div>

        {/* Progress Steps */}
        {step < 5 && (
          <div className="flex justify-center space-x-4 mb-8">
            <div
              className={`step-indicator ${
                step >= 1 ? "step-active" : "step-inactive"
              }`}
            >
              1
            </div>
            {!branchId && (
              <div
                className={`step-indicator ${
                  step >= 2 ? "step-active" : "step-inactive"
                }`}
              >
                2
              </div>
            )}
            <div
              className={`step-indicator ${
                step >= (branchId ? 2 : 3) ? "step-active" : "step-inactive"
              }`}
            >
              {branchId ? "2" : "3"}
            </div>
            <div
              className={`step-indicator ${
                step >= (branchId ? 3 : 4) ? "step-active" : "step-inactive"
              }`}
            >
              {branchId ? "3" : "4"}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="space-y-6">
          {/* Welcome Message */}
          <div className="card p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Welcome to {organization?.name || "our queue system"}
            </h2>
            <p className="text-gray-600 mb-4">
              {organization?.welcome_message ||
                "Welcome to our smart queue system. Please take your number and wait for your turn."}
            </p>
          </div>

          {/* Step 1: Phone Number */}
          {step === 1 && (
            <div className="card p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="step-indicator step-active">1</div>
                <h3 className="text-lg font-semibold text-gray-900">Phone</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {!branchId && (
                    <>
                      <span>2</span>
                      <span>Branch</span>
                      <span>3</span>
                    </>
                  )}
                  {branchId && (
                    <>
                      <span>2</span>
                    </>
                  )}
                  <span>Service</span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  Contact Information
                </h4>
                <p className="text-gray-600">
                  Phone number is required for notifications and queue
                  management.
                </p>

                <OrganizationPhoneInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  organizationId={orgId || ""}
                  required
                />

                <button
                  onClick={handleContinue}
                  disabled={!isValidPhoneNumber(phoneNumber)}
                  className="w-full dynamic-button text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Branch Selection */}
          {step === 2 && (
            <div className="card p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleGoBack}
                    aria-label="Go back to previous step"
                    className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 text-gray-600" />
                  </button>
                  <h4 className="text-lg font-semibold text-gray-900">
                    Select Branch
                  </h4>
                </div>

                <div className="space-y-3">
                  {branches.map((branch) => (
                    <button
                      key={branch.id}
                      onClick={() => {
                        setSelectedBranch(branch.id);
                        // Update stored parameters when user selects a branch
                        URLPersistenceService.updateStoredParams(
                          orgId,
                          branch.id
                        );
                        setStep(3);
                      }}
                      className="w-full p-4 border border-gray-200 rounded-xl text-left hover:border-primary-500 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900">
                            {branch.name}
                          </h5>
                          {branch.address && (
                            <div className="flex items-center space-x-1 text-sm text-gray-500 mt-1">
                              <MapPin className="w-3 h-3" />
                              <span>{branch.address}</span>
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Department Selection */}
          {step === 3 && (
            <div className="card p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleGoBack}
                    aria-label="Go back to previous step"
                    className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 text-gray-600" />
                  </button>
                  <h4 className="text-lg font-semibold text-gray-900">
                    Select Department
                  </h4>
                </div>

                <div className="space-y-3">
                  {departments.map((department) => (
                    <button
                      key={department.id}
                      onClick={() => {
                        setSelectedDepartment(department.id);
                        // Update stored parameters when user selects a department
                        URLPersistenceService.updateStoredParams(
                          orgId,
                          selectedBranch,
                          department.id
                        );
                        // Automatically proceed to service selection
                        setStep(4);
                      }}
                      className={`w-full p-4 border rounded-xl text-left transition-colors ${
                        selectedDepartment === department.id
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 hover:border-primary-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold dynamic-icon-bg">
                            {department.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">
                            {department.name}
                          </span>
                        </div>
                        {selectedDepartment === department.id && (
                          <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                      {department.description && (
                        <p className="text-sm text-gray-600 mt-2">
                          {department.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Service Selection */}
          {step === 4 && (
            <div className="card p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleGoBack}
                    aria-label="Go back to previous step"
                    className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 text-gray-600" />
                  </button>
                  <h4 className="text-lg font-semibold text-gray-900">
                    Select Service
                  </h4>
                </div>

                <div className="space-y-3">
                  {services.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No services available for this department.</p>
                    </div>
                  ) : (
                    services.map((service) => (
                      <button
                        key={service.id}
                        onClick={async () => {
                          setSelectedService(service.id);
                          // Calculate expected ticket number
                          const expectedNumber = await getExpectedTicketNumber(
                            service.id
                          );
                          setExpectedTicketNumber(expectedNumber);
                        }}
                        className={`w-full p-4 border rounded-xl text-left transition-colors ${
                          selectedService === service.id
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-primary-500"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold dynamic-icon-bg">
                              {service.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">
                                {service.name}
                              </span>
                              <div className="text-sm text-gray-600">
                                Estimated time: {service.estimated_time} minutes
                              </div>
                            </div>
                          </div>
                          {selectedService === service.id && (
                            <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-sm text-gray-600 mt-2">
                            {service.description}
                          </p>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {selectedService && queueStatus && (
                  <div className="bg-gray-50 rounded-xl p-4 mt-6">
                    <h5 className="font-medium text-gray-900 mb-3">
                      Current Queue Status
                    </h5>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          {queueStatus.currentServing || "--"}
                        </div>
                        <div className="text-xs text-gray-500">Now Serving</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          {queueStatus.waitingCount}
                        </div>
                        <div className="text-xs text-gray-500">Waiting</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          {queueStatus.estimatedWaitTime}m
                        </div>
                        <div className="text-xs text-gray-500">Est. Wait</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notification Preference Selection */}
                {selectedService && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                    <h5 className="font-medium text-gray-900 mb-3">
                      How would you like to receive updates?
                    </h5>
                    <div className="space-y-2">
                      <button
                        onClick={() => setNotificationPreference("push")}
                        className={`w-full p-3 border rounded-lg text-left transition-colors ${
                          notificationPreference === "push"
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-primary-500"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-primary-600">
                            <Bell className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              Browser Notifications
                            </div>
                            <div className="text-sm text-gray-600">
                              Get notified directly in your browser
                            </div>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setNotificationPreference("whatsapp")}
                        className={`w-full p-3 border rounded-lg text-left transition-colors ${
                          notificationPreference === "whatsapp"
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-primary-500"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-green-600">
                            <MessageCircle className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              WhatsApp Notifications
                            </div>
                            <div className="text-sm text-gray-600">
                              Get updates on WhatsApp
                            </div>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setNotificationPreference("both")}
                        className={`w-full p-3 border rounded-lg text-left transition-colors ${
                          notificationPreference === "both"
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-primary-500"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <Bell className="h-6 w-6 text-primary-600" />
                            <MessageCircle className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              Both Notifications
                            </div>
                            <div className="text-sm text-gray-600">
                              Get updates via browser and WhatsApp
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleContinue}
                  disabled={
                    !selectedService || !notificationPreference || loading
                  }
                  className="w-full dynamic-button text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 disabled:opacity-50"
                >
                  {loading
                    ? "Joining Queue..."
                    : "Join Queue & Setup Notifications"}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Queue Join + Notification Setup */}
          {step === 5 && selectedService && (
            <div className="card p-6 text-center">
              <div className="space-y-6">
                <div>
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    {notificationSetupStatus === "setting_up" ? (
                      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                    ) : notificationSetupStatus === "success" ? (
                      <div className="w-8 h-8 text-green-600">✅</div>
                    ) : notificationSetupStatus === "failed" ? (
                      <div className="w-8 h-8 text-red-600">❌</div>
                    ) : (
                      <Phone className="w-8 h-8 text-blue-600" />
                    )}
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {notificationSetupStatus === "setting_up"
                      ? "Joining Queue..."
                      : notificationSetupStatus === "success"
                      ? "Successfully Joined!"
                      : notificationSetupStatus === "failed"
                      ? "Setup Failed"
                      : "Ready to Join Queue"}
                  </h3>

                  {notificationSetupStatus === "setting_up" && (
                    <div className="space-y-3">
                      <p className="text-gray-600">Creating your ticket...</p>

                      {(notificationPreference === "whatsapp" ||
                        notificationPreference === "both") && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-sm text-yellow-800 font-medium">
                            🔄 WhatsApp Setup in Progress
                          </p>
                          <p className="text-sm text-yellow-700 mt-1">
                            A WhatsApp chat has opened. Please send the "Hello"
                            message to complete setup.
                            {whatsappRetryCount > 0 && (
                              <span className="block mt-1">
                                Checking for message... ({whatsappRetryCount}/3)
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {notificationSetupStatus === "success" && (
                    <div className="space-y-3">
                      <p className="text-gray-600">
                        Your ticket{" "}
                        <span className="font-bold">{ticketNumber}</span> has
                        been created!
                      </p>
                      {(notificationPreference === "whatsapp" ||
                        notificationPreference === "both") &&
                        whatsappOptIn && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-sm text-green-800">
                              ✅ WhatsApp notifications enabled
                            </p>
                          </div>
                        )}
                      {(notificationPreference === "push" ||
                        notificationPreference === "both") &&
                        pushNotificationsEnabled && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-sm text-green-800">
                              ✅ Browser notifications enabled
                            </p>
                          </div>
                        )}
                    </div>
                  )}

                  {notificationSetupStatus === "failed" && (
                    <div className="space-y-3">
                      <p className="text-gray-600">
                        Your ticket was created but notification setup
                        encountered issues.
                      </p>
                      <button
                        onClick={() => {
                          setNotificationSetupStatus("pending");
                          setStep(4); // Go back to service selection
                        }}
                        className="text-blue-600 hover:underline"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                </div>

                {/* Auto-continue when successful */}
                {notificationSetupStatus === "success" && (
                  <div className="text-sm text-gray-500">
                    Redirecting to your queue status...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Confirmation */}
          {step === 6 && (
            <div className="card p-6 text-center">
              <div className="space-y-6">
                <div>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    You're in the{" "}
                    {services.find((s) => s.id === selectedService)?.name ||
                      "Service"}{" "}
                    Queue!
                  </h3>
                  <p className="text-gray-600">Your ticket number is</p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {ticketNumber}
                  </div>
                  <p className="text-gray-600">
                    {notificationPreference === "whatsapp" && whatsappOptIn
                      ? "We'll send you WhatsApp updates about your queue status"
                      : notificationPreference === "push" &&
                        pushNotificationsEnabled
                      ? "We'll send you push notifications about your queue status"
                      : notificationPreference === "both" &&
                        (whatsappOptIn || pushNotificationsEnabled)
                      ? "We'll send you updates via " +
                        (whatsappOptIn && pushNotificationsEnabled
                          ? "both WhatsApp and browser notifications"
                          : whatsappOptIn
                          ? "WhatsApp"
                          : "browser notifications")
                      : "Keep this page open to monitor your queue status"}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Currently Serving
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {queueStatus?.currentServing || "--"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Estimated Wait
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {queueStatus?.estimatedWaitTime || 0} minutes
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-500">Need help? Contact us:</p>
                <div className="flex justify-center space-x-4">
                  <button className="text-sm text-primary-600 underline">
                    📞 +1234567890
                  </button>
                  <button className="text-sm text-primary-600 underline">
                    ✉️ Email us
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Browser Compatibility Warning */}
          {showBrowserWarning && browserInfo && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    {browserInfo.isSupported ? (
                      <Info className="w-8 h-8 text-amber-600" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-amber-600" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {browserInfo.isSupported
                      ? "Limited Notification Support"
                      : "Notifications Not Supported"}
                  </h3>
                  <div className="text-left space-y-2">
                    <p className="text-sm text-gray-600">
                      <strong>Platform:</strong> {browserInfo.platform}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Browser:</strong> {browserInfo.browser}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Support Level:</strong> {browserInfo.supportLevel}
                    </p>
                    {browserInfo.limitations.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Limitations:
                        </p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {browserInfo.limitations.map((limitation, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-amber-500 mr-1">•</span>
                              {limitation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      {BrowserDetection.getRecommendation(browserInfo)}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {browserInfo.isSupported && (
                      <button
                        onClick={() => {
                          setShowBrowserWarning(false);
                          setShowPushPrompt(true);
                        }}
                        className="w-full dynamic-button text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200"
                      >
                        Continue with Limited Support
                      </button>
                    )}
                    <button
                      onClick={() => setShowBrowserWarning(false)}
                      className="w-full text-gray-600 font-medium py-3 px-6 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
                    >
                      I Understand
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Push Notification Prompt */}
          {showPushPrompt && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Enable Notifications?
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Get instant notifications when it's almost your turn and
                    when you're called, even when the app is closed.
                  </p>
                  {browserInfo && browserInfo.platform === "iOS" && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>iOS Safari:</strong> After clicking "Enable",
                        you'll see a browser permission popup. Make sure to tap
                        "Allow" to receive notifications.
                      </p>
                    </div>
                  )}
                  {browserInfo && browserInfo.platform === "Windows" && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>Windows:</strong> Your browser will ask for
                        notification permission. Click "Allow" in the popup that
                        appears.
                      </p>
                    </div>
                  )}
                  <div className="space-y-3">
                    <button
                      onClick={enablePushNotifications}
                      disabled={pushSubscriptionLoading}
                      className="w-full dynamic-button text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pushSubscriptionLoading ? (
                        <>
                          <div className="w-4 h-4 mr-2 inline-block border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4 mr-2 inline" />
                          Enable Notifications
                        </>
                      )}
                    </button>
                    <button
                      onClick={dismissPushPrompt}
                      className="w-full text-gray-600 font-medium py-3 px-6 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <BellOff className="w-4 h-4 mr-2 inline" />
                      Use WhatsApp Only
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    You can change this anytime in your browser settings
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PWA Install Helper */}
      {orgId && (
        <PWAInstallHelper
          orgId={orgId}
          branchId={selectedBranch}
          organizationName={organization?.name}
          organizationLogo={organization?.logo_url || undefined}
        />
      )}

      {/* Push Notification Popup */}
      <PushNotificationPopup
        notification={currentNotification}
        onClose={() => setCurrentNotification(null)}
      />
    </DynamicTheme>
  );
}

export default function CustomerApp() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <CustomerAppContent />
    </Suspense>
  );
}
