// Push Subscription Manager for Customer App
// Enhanced handling for app restarts and session management

import { logger } from "./logger";
import { pushNotificationService } from "./pushNotifications";

interface PersistentSubscriptionData {
  organizationId: string;
  ticketId: string;
  subscriptionEndpoint: string;
  timestamp: number;
  isActive: boolean;
}

class PushSubscriptionManager {
  private readonly storageKey = "activeTicketSubscription";
  private readonly maxAge = 12 * 60 * 60 * 1000; // 12 hours

  /**
   * Store active subscription data for app restart recovery
   */
  async storeActiveSubscription(
    organizationId: string,
    ticketId: string,
    subscriptionEndpoint: string
  ): Promise<void> {
    try {
      const data: PersistentSubscriptionData = {
        organizationId,
        ticketId,
        subscriptionEndpoint,
        timestamp: Date.now(),
        isActive: true,
      };

      localStorage.setItem(this.storageKey, JSON.stringify(data));
      logger.debug("Active subscription stored for recovery:", {
        ticketId,
        organizationId,
      });
    } catch (error) {
      logger.error("Error storing active subscription:", error);
    }
  }

  /**
   * Restore push subscription after app restart
   */
  async restoreSubscriptionOnStartup(organizationId: string): Promise<boolean> {
    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (!storedData) {
        logger.debug("No stored subscription found");
        return false;
      }

      const data: PersistentSubscriptionData = JSON.parse(storedData);

      // Check if data is too old or for different organization
      if (
        Date.now() - data.timestamp > this.maxAge ||
        data.organizationId !== organizationId
      ) {
        logger.log(
          "Stored subscription expired or wrong organization, removing"
        );
        localStorage.removeItem(this.storageKey);
        return false;
      }

      // Check if ticket still exists and is active
      const ticketExists = await this.verifyTicketExists(
        organizationId,
        data.ticketId
      );
      if (!ticketExists) {
        logger.debug("Ticket no longer exists, removing stored subscription");
        localStorage.removeItem(this.storageKey);
        return false;
      }

      logger.log(
        "Attempting to restore subscription for ticket:",
        data.ticketId
      );

      // Re-establish subscription
      const success = await pushNotificationService.subscribe(
        organizationId,
        data.ticketId
      );

      if (success) {
        logger.debug("Successfully restored push subscription after app restart");
        return true;
      } else {
        logger.debug("Failed to restore subscription, will clear stored data");
        localStorage.removeItem(this.storageKey);
        return false;
      }
    } catch (error) {
      logger.error("Error restoring subscription on startup:", error);
      localStorage.removeItem(this.storageKey);
      return false;
    }
  }

  /**
   * Check if ticket still exists in the system
   */
  private async verifyTicketExists(
    organizationId: string,
    ticketId: string
  ): Promise<boolean> {
    try {
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL;
      if (!adminUrl || adminUrl === "undefined") {
        logger.error("Admin URL not configured for ticket verification");
        return false;
      }

      const response = await fetch(
        `${adminUrl}/api/notifications/subscribe?organizationId=${organizationId}&ticketId=${ticketId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        return result.ticketExists === true;
      }

      return false;
    } catch (error) {
      logger.error("Error verifying ticket existence:", error);
      return false;
    }
  }

  /**
   * Clear stored subscription data
   */
  clearStoredSubscription(): void {
    try {
      localStorage.removeItem(this.storageKey);
      logger.debug("Stored subscription data cleared");
    } catch (error) {
      logger.error("Error clearing stored subscription:", error);
    }
  }

  /**
   * Get current stored subscription info
   */
  getStoredSubscriptionInfo(): PersistentSubscriptionData | null {
    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (!storedData) return null;

      const data: PersistentSubscriptionData = JSON.parse(storedData);

      // Check if expired
      if (Date.now() - data.timestamp > this.maxAge) {
        localStorage.removeItem(this.storageKey);
        return null;
      }

      return data;
    } catch (error) {
      logger.error("Error getting stored subscription info:", error);
      return null;
    }
  }

  /**
   * Check if we have an active subscription for current session
   */
  hasActiveSubscription(organizationId: string, ticketId?: string): boolean {
    const stored = this.getStoredSubscriptionInfo();
    if (!stored) return false;

    if (stored.organizationId !== organizationId) return false;
    if (ticketId && stored.ticketId !== ticketId) return false;

    return stored.isActive;
  }
}

// Export singleton instance
export const pushSubscriptionManager = new PushSubscriptionManager();
export default PushSubscriptionManager;
