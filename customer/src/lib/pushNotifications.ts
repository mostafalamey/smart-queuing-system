// Push Notification Service for Customer App
// Handles service worker registration, push subscriptions, and notification permissions

import { logger } from "./logger";

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  renotify?: boolean;
  vibrate?: number[];
}

class PushNotificationService {
  private vapidPublicKey: string;
  private adminUrl: string;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
    this.adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL!;

    // Validate environment variables
    if (!this.vapidPublicKey) {
      logger.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set!");
    }
    if (!this.adminUrl) {
      logger.error("NEXT_PUBLIC_ADMIN_URL is not set!");
    }

    logger.debug("Push Notification Service initialized");
  }

  /**
   * Initialize the push notification service
   * Enhanced for iOS Safari PWA compatibility
   */
  async initialize(): Promise<boolean> {
    try {
      logger.debug("Initializing push notification service...");

      // Check if service workers are supported
      if (!("serviceWorker" in navigator)) {
        logger.debug("Service workers not supported");
        return false;
      }

      // Check if push notifications are supported
      if (!("PushManager" in window)) {
        logger.debug("Push Manager not supported");
        return false;
      }

      // Enhanced iOS Safari detection
      const isIOSSafari = this.isIOSSafari();
      const isPWAMode = this.isPWAMode();

      logger.debug("Browser environment:", {
        isIOSSafari,
        isPWAMode,
        userAgent: navigator.userAgent,
      });

      // Special handling for iOS Safari PWA mode
      if (isIOSSafari && isPWAMode) {
        logger.debug(
          "iOS Safari PWA mode detected - applying enhanced compatibility"
        );
        // Add delay for iOS Safari PWA initialization
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      logger.debug("Browser supports service workers and push notifications");

      // Register service worker
      const registration = await this.registerServiceWorker();
      if (!registration) {
        logger.error("Service worker registration failed");
        return false;
      }

      logger.debug("Service worker registered successfully");
      this.serviceWorkerRegistration = registration;
      return true;
    } catch (error) {
      logger.error("Failed to initialize push notification service:", error);
      return false;
    }
  }

  /**
   * Register the service worker
   */
  private async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
      logger.debug("Registering service worker...");

      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      logger.debug("Service worker registered:", registration);
      logger.debug("Service worker scope:", registration.scope);
      logger.debug("Service worker state:", registration.active?.state);

      // Handle service worker updates
      registration.addEventListener("updatefound", () => {
        logger.debug("Service worker update found");
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            logger.debug("Service worker state changed:", newWorker.state);
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // Optionally show update notification to user
              this.handleServiceWorkerUpdate(registration);
            }
          });
        }
      });

      return registration;
    } catch (error) {
      logger.error("Service Worker registration failed:", error);
      return null;
    }
  }

  /**
   * Handle service worker updates
   */
  private async handleServiceWorkerUpdate(
    registration: ServiceWorkerRegistration
  ) {
    // Send message to new service worker to skip waiting
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    // Reload page after service worker activation
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<"granted" | "denied" | "default"> {
    try {
      logger.debug("Requesting notification permission...");

      if (!("Notification" in window)) {
        logger.debug("Notifications not supported");
        return "denied";
      }

      // Check current permission status
      let permission = Notification.permission;
      logger.debug("Current permission status:", permission);

      // Request permission if not already granted or denied
      if (permission === "default") {
        logger.debug(
          "Permission is default, requesting permission from user..."
        );

        // Use the newer Promise-based API if available, fallback to callback
        if (
          "requestPermission" in Notification &&
          typeof Notification.requestPermission === "function"
        ) {
          try {
            logger.debug("Using Promise-based requestPermission");
            permission = await Notification.requestPermission();
            logger.debug("Permission result (Promise):", permission);
          } catch (error) {
            logger.error("Error with Promise-based requestPermission:", error);
            // Fallback to callback-based API for older browsers
            logger.debug("Falling back to callback-based requestPermission");
            permission = await new Promise((resolve) => {
              Notification.requestPermission((result) => {
                logger.debug("Permission result (callback):", result);
                resolve(result);
              });
            });
          }
        } else {
          logger.debug("Using callback-based requestPermission");
          permission = await new Promise((resolve) => {
            Notification.requestPermission((result) => {
              logger.debug("Permission result (legacy callback):", result);
              resolve(result);
            });
          });
        }
      }

      logger.debug("Final permission status:", permission);
      return permission;
    } catch (error) {
      logger.error("Error requesting notification permission:", error);
      return "denied";
    }
  }

  /**
   * Initialize push notifications without creating subscription
   * Only checks permission and prepares for subscription when needed
   */
  async initializePushNotifications(
    organizationId: string
  ): Promise<PushSubscription | null> {
    try {
      logger.debug(
        "Initializing push notifications (permission check only)..."
      );
      logger.debug("- Organization ID:", organizationId);

      if (!this.serviceWorkerRegistration) {
        logger.error("Service worker not registered");
        return null;
      }

      logger.debug("Service worker is registered, checking permission...");

      // Only check permission, don't create subscription automatically
      const permission = Notification.permission;
      logger.debug("Current permission status:", permission);

      if (permission !== "granted") {
        logger.debug("Permission not granted, no subscription created");
        return null;
      }

      logger.debug("Permission granted, checking for existing subscription...");

      // Check if already subscribed
      let subscription =
        await this.serviceWorkerRegistration.pushManager.getSubscription();
      logger.debug("Existing subscription:", subscription ? "Found" : "None");

      if (subscription) {
        logger.debug("Found existing subscription, no need to create new one");
        logger.debug("Subscription endpoint:", subscription.endpoint);
        return subscription;
      }

      logger.debug("No existing subscription found, will create when needed");
      return null;
    } catch (error) {
      logger.error("Error initializing push notifications:", error);

      if (error instanceof Error) {
        logger.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }

      return null;
    }
  }

  /**
   * Create subscription when user explicitly opts in
   * This replaces the old initializePushNotifications behavior
   */
  async createSubscriptionForUser(
    organizationId: string
  ): Promise<PushSubscription | null> {
    try {
      logger.debug("Creating push subscription for user opt-in...");
      logger.debug("- Organization ID:", organizationId);

      if (!this.serviceWorkerRegistration) {
        logger.error("Service worker not registered");
        return null;
      }

      // Check permission
      const permission = await this.requestPermission();
      logger.debug("Permission result:", permission);

      if (permission !== "granted") {
        logger.debug("Permission not granted, subscription failed");
        return null;
      }

      logger.debug("Permission granted, checking for existing subscription...");

      // Check if already subscribed
      let subscription =
        await this.serviceWorkerRegistration.pushManager.getSubscription();
      logger.debug("Existing subscription:", subscription ? "Found" : "None");

      // Only create new subscription if none exists
      if (!subscription) {
        logger.debug("Creating new subscription with VAPID key...");
        logger.log(
          "VAPID key (first 20 chars):",
          this.vapidPublicKey ? this.vapidPublicKey.substring(0, 20) : "NOT SET"
        );

        // Create new subscription
        subscription =
          await this.serviceWorkerRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(
              this.vapidPublicKey
            ) as BufferSource,
          });

        logger.debug("New subscription created successfully!");
      } else {
        logger.debug("Using existing valid subscription");
      }

      logger.debug("Subscription endpoint:", subscription.endpoint);

      // Store subscription temporarily in localStorage for later association
      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey("p256dh")!),
          auth: this.arrayBufferToBase64(subscription.getKey("auth")!),
        },
      };

      localStorage.setItem(
        "pendingPushSubscription",
        JSON.stringify({
          organizationId,
          subscription: subscriptionData,
          timestamp: Date.now(),
        })
      );

      logger.debug("Push subscription created and stored temporarily");
      return subscription;
    } catch (error) {
      logger.error("Error creating push subscription:", error);
      return null;
    }
  }

  /**
   * Associate pending push subscription with a ticket ID
   */
  async associateSubscriptionWithTicket(ticketId: string): Promise<boolean> {
    try {
      const pendingData = localStorage.getItem("pendingPushSubscription");
      if (!pendingData) {
        logger.debug("No pending subscription found");
        return false;
      }

      const {
        organizationId,
        subscription: subscriptionData,
        timestamp,
      } = JSON.parse(pendingData);

      // Check if the pending subscription is too old (older than 10 minutes)
      if (Date.now() - timestamp > 10 * 60 * 1000) {
        logger.debug("Pending subscription expired, removing");
        localStorage.removeItem("pendingPushSubscription");
        return false;
      }

      logger.debug("Associating pending subscription with ticket:", ticketId);

      // Send subscription to server with ticket ID
      const success = await this.sendSubscriptionToServerWithData(
        organizationId,
        ticketId,
        subscriptionData
      );

      if (success) {
        // Remove pending subscription from localStorage
        localStorage.removeItem("pendingPushSubscription");
        logger.debug("Successfully associated subscription with ticket");
      }

      return success;
    } catch (error) {
      logger.error("Error associating subscription with ticket:", error);
      return false;
    }
  }

  /**
   * Subscribe to push notifications using phone number (NEW APPROACH)
   */
  async subscribeWithPhone(
    organizationId: string,
    customerPhone: string,
    notificationPreference: "push" | "whatsapp" | "both" = "push"
  ): Promise<boolean> {
    try {
      logger.debug("Starting phone-based push notification subscription...");
      logger.debug("- Organization ID:", organizationId);
      logger.debug("- Customer Phone:", customerPhone);

      if (!this.serviceWorkerRegistration) {
        logger.error("Service worker not registered");
        return false;
      }

      logger.debug("Service worker is registered, requesting permission...");

      // Check permission
      const permission = await this.requestPermission();
      logger.debug("Permission result:", permission);

      if (permission !== "granted") {
        logger.debug("Permission not granted, subscription failed");
        return false;
      }

      logger.debug("Permission granted, checking for existing subscription...");

      // Check if already subscribed
      let subscription =
        await this.serviceWorkerRegistration.pushManager.getSubscription();
      logger.debug("Existing subscription:", subscription ? "Found" : "None");

      // Only create new subscription if none exists
      if (!subscription) {
        logger.debug("Creating new subscription with VAPID key...");
        logger.log(
          "VAPID key (first 20 chars):",
          this.vapidPublicKey ? this.vapidPublicKey.substring(0, 20) : "NOT SET"
        );

        // Create new subscription
        subscription =
          await this.serviceWorkerRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(
              this.vapidPublicKey
            ) as BufferSource,
          });

        logger.debug("New subscription created successfully!");
      } else {
        logger.debug("Using existing valid subscription");
      }

      logger.debug("Subscription endpoint:", subscription.endpoint);

      // Send subscription to server immediately with phone number
      await new Promise((resolve) => setTimeout(resolve, 500));

      logger.debug("Sending phone-based subscription to server...");
      const success = await this.sendPhoneSubscriptionToServer(
        organizationId,
        customerPhone,
        subscription,
        notificationPreference
      );

      logger.log(
        "Phone-based subscription server response:",
        success ? "SUCCESS" : "FAILED"
      );
      return success;
    } catch (error) {
      logger.error("Error subscribing with phone number:", error);

      if (error instanceof Error) {
        logger.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }

      // Update preferences to indicate push failed
      await this.updateNotificationPreferencesForPhone(
        organizationId,
        customerPhone,
        true,
        notificationPreference // Pass the notification preference from the current call
      );
      return false;
    }
  }

  /**
   * Send phone-based subscription data to server
   */
  private async sendPhoneSubscriptionToServer(
    organizationId: string,
    customerPhone: string,
    subscription: PushSubscription,
    notificationPreference: "push" | "whatsapp" | "both" = "push",
    retryCount = 0
  ): Promise<boolean> {
    try {
      logger.log(
        `Sending phone-based subscription to server (attempt ${
          retryCount + 1
        })...`
      );

      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey("p256dh")!),
          auth: this.arrayBufferToBase64(subscription.getKey("auth")!),
        },
      };

      logger.debug("Phone subscription data prepared:", {
        endpoint: subscriptionData.endpoint,
        customerPhone: customerPhone,
        hasP256dh: !!subscriptionData.keys.p256dh,
        hasAuth: !!subscriptionData.keys.auth,
      });

      const requestBody = {
        organizationId,
        customerPhone, // Use phone number instead of ticket ID
        subscription: subscriptionData,
        userAgent: navigator.userAgent,
        notificationPreference, // Pass the user's notification preference
      };

      const url = `${this.adminUrl}/api/notifications/subscribe`;
      logger.debug("Sending POST request to:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      logger.debug("Server response status:", response.status);
      logger.debug("Server response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Server error response:", errorText);
        throw new Error(
          `Server responded with status: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();
      logger.debug("Server response body:", result);

      const success = result.success === true;
      logger.debug("Phone subscription success:", success);

      return success;
    } catch (error) {
      logger.error(
        `Error sending phone subscription data to server (attempt ${
          retryCount + 1
        }):`,
        error
      );

      // Retry logic: retry up to 2 times with increasing delay
      if (retryCount < 2) {
        const delay = (retryCount + 1) * 1000; // 1s, 2s delays
        logger.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendPhoneSubscriptionToServer(
          organizationId,
          customerPhone,
          subscription,
          notificationPreference,
          retryCount + 1
        );
      }

      logger.error("All retry attempts failed");
      return false;
    }
  }

  /**
   * Update notification preferences using phone number
   */
  private async updateNotificationPreferencesForPhone(
    organizationId: string,
    customerPhone: string,
    pushDenied: boolean,
    notificationPreference: "push" | "whatsapp" | "both" = "push"
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.adminUrl}/api/notifications/subscribe`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            organizationId,
            customerPhone,
            pushDenied,
            notificationPreference, // Pass the notification preference
          }),
        }
      );

      if (response.ok) {
        await response.json();
        logger.log(
          "Notification preferences updated for phone:",
          customerPhone
        );
      }
    } catch (error) {
      logger.error("Error updating notification preferences:", error);
    }
  }

  /**
   * Subscribe to push notifications using ticket ID (LEGACY - keeping for compatibility)
   */
  async subscribe(organizationId: string, ticketId: string): Promise<boolean> {
    try {
      logger.debug("Starting push notification subscription process...");
      logger.debug("- Organization ID:", organizationId);
      logger.debug("- Ticket ID:", ticketId);

      if (!this.serviceWorkerRegistration) {
        logger.error("Service worker not registered");
        return false;
      }

      logger.debug("Service worker is registered, requesting permission...");

      // Check permission
      const permission = await this.requestPermission();
      logger.debug("Permission result:", permission);

      if (permission !== "granted") {
        logger.debug("Permission not granted, subscription failed");
        return false;
      }

      logger.debug("Permission granted, checking for existing subscription...");

      // Check if already subscribed
      let subscription =
        await this.serviceWorkerRegistration.pushManager.getSubscription();
      logger.debug("Existing subscription:", subscription ? "Found" : "None");

      // Only create new subscription if none exists
      if (!subscription) {
        logger.debug("Creating new subscription with VAPID key...");
        logger.log(
          "VAPID key (first 20 chars):",
          this.vapidPublicKey ? this.vapidPublicKey.substring(0, 20) : "NOT SET"
        );

        // Create new subscription
        subscription =
          await this.serviceWorkerRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(
              this.vapidPublicKey
            ) as BufferSource,
          });

        logger.debug("New subscription created successfully!");
      } else {
        logger.debug("Using existing valid subscription");
      }

      logger.debug("Subscription endpoint:", subscription.endpoint);

      // Send subscription to server (with small delay to ensure browser is ready)
      await new Promise((resolve) => setTimeout(resolve, 500));

      logger.debug("Sending subscription to server...");
      const success = await this.sendSubscriptionToServer(
        organizationId,
        ticketId,
        subscription
      );

      logger.log(
        "Subscription server response:",
        success ? "SUCCESS" : "FAILED"
      );
      return success;
    } catch (error) {
      logger.error("Error subscribing to push notifications:", error);

      if (error instanceof Error) {
        logger.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }

      // Update preferences to indicate push failed
      await this.updateNotificationPreferences(organizationId, ticketId, true);
      return false;
    }
  }

  /**
   * Send subscription data to server using ticket ID
   */
  private async sendSubscriptionToServer(
    organizationId: string,
    ticketId: string,
    subscription: PushSubscription,
    retryCount = 0
  ): Promise<boolean> {
    try {
      logger.log(
        `Sending subscription to server (attempt ${retryCount + 1})...`
      );

      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey("p256dh")!),
          auth: this.arrayBufferToBase64(subscription.getKey("auth")!),
        },
      };

      return await this.sendSubscriptionToServerWithData(
        organizationId,
        ticketId,
        subscriptionData,
        retryCount
      );
    } catch (error) {
      logger.error("Error in sendSubscriptionToServer:", error);
      return false;
    }
  }

  /**
   * Send subscription data to server using prepared subscription data
   */
  private async sendSubscriptionToServerWithData(
    organizationId: string,
    ticketId: string,
    subscriptionData: PushSubscriptionData,
    retryCount = 0
  ): Promise<boolean> {
    try {
      logger.log(
        `Sending subscription data to server (attempt ${retryCount + 1})...`
      );

      logger.debug("Subscription data prepared:", {
        endpoint: subscriptionData.endpoint,
        hasP256dh: !!subscriptionData.keys.p256dh,
        hasAuth: !!subscriptionData.keys.auth,
      });

      const requestBody = {
        organizationId,
        ticketId, // Use ticket ID as primary identifier
        subscription: subscriptionData,
        userAgent: navigator.userAgent,
      };

      const url = `${this.adminUrl}/api/notifications/subscribe`;
      logger.debug("Sending POST request to:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      logger.debug("Server response status:", response.status);
      logger.debug("Server response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Server error response:", errorText);
        throw new Error(
          `Server responded with status: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();
      logger.debug("Server response body:", result);

      const success = result.success === true;
      logger.log("Subscription success:", success);

      return success;
    } catch (error) {
      logger.error(
        `Error sending subscription data to server (attempt ${
          retryCount + 1
        }):`,
        error
      );

      // Retry logic: retry up to 2 times with increasing delay
      if (retryCount < 2) {
        const delay = (retryCount + 1) * 1000; // 1s, 2s delays
        logger.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendSubscriptionToServerWithData(
          organizationId,
          ticketId,
          subscriptionData,
          retryCount + 1
        );
      }

      logger.error("All retry attempts failed");
      return false;
    }
  }

  /**
   * Update notification preferences using ticket ID
   */
  private async updateNotificationPreferences(
    organizationId: string,
    ticketId: string,
    pushDenied: boolean
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.adminUrl}/api/notifications/subscribe`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            organizationId,
            ticketId,
            pushDenied,
          }),
        }
      );

      if (response.ok) {
        await response.json();
      }
    } catch (error) {
      logger.error("Error updating notification preferences:", error);
    }
  }

  /**
   * Get current notification preferences by ticket ID
   */
  async getNotificationPreferences(
    organizationId: string,
    ticketId: string
  ): Promise<any> {
    try {
      const response = await fetch(
        `${this.adminUrl}/api/notifications/subscribe?organizationId=${organizationId}&ticketId=${ticketId}`
      );

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      logger.error("Error getting notification preferences:", error);
      return null;
    }
  }

  /**
   * Check if push notifications are supported and enabled
   */
  isSupported(): boolean {
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }

  /**
   * Get current push subscription
   */
  async getCurrentSubscription(): Promise<PushSubscription | null> {
    try {
      if (!this.serviceWorkerRegistration) {
        return null;
      }

      return await this.serviceWorkerRegistration.pushManager.getSubscription();
    } catch (error) {
      logger.error("Error getting current subscription:", error);
      return null;
    }
  }

  /**
   * Check current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if ("Notification" in window) {
      return Notification.permission;
    }
    return "denied";
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        return false;
      }

      const subscription =
        await this.serviceWorkerRegistration.pushManager.getSubscription();
      if (subscription) {
        const success = await subscription.unsubscribe();
        return success;
      }

      return true;
    } catch (error) {
      logger.error("Error unsubscribing from push notifications:", error);
      return false;
    }
  }

  /**
   * Send a test notification (for development)
   */
  async sendTestNotification(
    organizationId: string,
    customerPhone: string,
    ticketNumber: string
  ): Promise<boolean> {
    try {
      const payload: NotificationPayload = {
        title: "🎫 Test Notification",
        body: `Your ticket ${ticketNumber} - This is a test notification`,
        icon: "/logo_s.png",
        badge: "/favicon.svg",
        data: {
          ticketNumber,
          notificationType: "test",
          clickUrl: "/",
          timestamp: Date.now(),
        },
        actions: [
          {
            action: "view_queue",
            title: "View Queue",
          },
          {
            action: "dismiss",
            title: "Dismiss",
          },
        ],
        requireInteraction: false,
        tag: "test-notification",
        vibrate: [200, 100, 200],
      };

      const response = await fetch(`${this.adminUrl}/api/notifications/push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          customerPhone,
          payload,
          notificationType: "test",
          ticketNumber,
        }),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      logger.error("Error sending test notification:", error);
      return false;
    }
  }

  /**
   * Utility function to convert VAPID key
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Utility function to convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Detect if running on iOS Safari
   */
  private isIOSSafari(): boolean {
    if (typeof window === "undefined") return false;

    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isSafari =
      /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent);

    return isIOS && isSafari;
  }

  /**
   * Detect if the app is running as a PWA
   */
  private isPWAMode(): boolean {
    if (typeof window === "undefined") return false;

    // Check for standalone display mode
    const isStandalone =
      window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches;

    // Check for iOS Safari home screen mode
    const isIOSStandalone =
      "standalone" in window.navigator &&
      (window.navigator as any).standalone === true;

    // Check for Android PWA
    const isAndroidPWA =
      window.matchMedia &&
      window.matchMedia("(display-mode: minimal-ui)").matches;

    return isStandalone || isIOSStandalone || isAndroidPWA;
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();

// Export class for type checking
export default PushNotificationService;
