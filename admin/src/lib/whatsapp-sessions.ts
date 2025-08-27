import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface WhatsAppSession {
  id: string;
  phoneNumber: string;
  initiatedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  organizationId?: string;
  ticketId?: string;
  customerName?: string;
}

export interface CreateSessionData {
  phoneNumber: string;
  organizationId?: string;
  ticketId?: string;
  customerName?: string;
}

class WhatsAppSessionService {
  private static instance: WhatsAppSessionService;

  static getInstance(): WhatsAppSessionService {
    if (!WhatsAppSessionService.instance) {
      WhatsAppSessionService.instance = new WhatsAppSessionService();
    }
    return WhatsAppSessionService.instance;
  }

  /**
   * Check if a phone number has an active WhatsApp session
   */
  async hasActiveSession(
    phoneNumber: string,
    organizationId?: string
  ): Promise<boolean> {
    try {
      const cleanPhone = this.cleanPhoneNumber(phoneNumber);
      const now = new Date();

      console.log("🔍 WhatsAppSessionService: Checking session for:", {
        original: phoneNumber,
        cleaned: cleanPhone,
        organizationId,
        now: now.toISOString(),
      });

      let query = supabase
        .from("whatsapp_sessions")
        .select("id, organization_id")
        .eq("phone_number", cleanPhone)
        .eq("is_active", true)
        .gt("expires_at", now.toISOString());

      // Add organization filter if provided
      // Temporarily disabled for testing
      // if (organizationId) {
      //   query = query.eq("organization_id", organizationId);
      // }

      const { data, error } = await query.single();

      console.log("🔍 WhatsAppSessionService: Query result:", { data, error });

      if (error) {
        console.log(
          "No active session found for",
          cleanPhone,
          "Error:",
          error.message
        );
        return false;
      }

      const result = !!data;
      console.log(
        "🔍 WhatsAppSessionService: hasActiveSession result:",
        result
      );
      return result;
    } catch (error) {
      console.error("Error checking WhatsApp session:", error);
      return false;
    }
  }

  /**
   * Get active session details for a phone number
   */
  async getActiveSession(phoneNumber: string): Promise<WhatsAppSession | null> {
    try {
      const cleanPhone = this.cleanPhoneNumber(phoneNumber);
      const now = new Date();

      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .eq("phone_number", cleanPhone)
        .eq("is_active", true)
        .gt("expires_at", now.toISOString())
        .order("created_at", { ascending: false })
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        phoneNumber: data.phone_number,
        initiatedAt: new Date(data.initiated_at),
        expiresAt: new Date(data.expires_at),
        isActive: data.is_active,
        organizationId: data.organization_id,
        ticketId: data.ticket_id,
        customerName: data.customer_name,
      };
    } catch (error) {
      console.error("Error getting WhatsApp session:", error);
      return null;
    }
  }

  /**
   * Create a new WhatsApp session (24-hour window)
   */
  async createSession(
    data: CreateSessionData
  ): Promise<WhatsAppSession | null> {
    try {
      const cleanPhone = this.cleanPhoneNumber(data.phoneNumber);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

      // First, deactivate any existing sessions for this phone number
      await this.deactivateExistingSessions(cleanPhone);

      const { data: sessionData, error } = await supabase
        .from("whatsapp_sessions")
        .insert({
          phone_number: cleanPhone,
          initiated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          is_active: true,
          organization_id: data.organizationId,
          ticket_id: data.ticketId,
          customer_name: data.customerName,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating WhatsApp session:", error);
        return null;
      }

      console.log("Created WhatsApp session:", {
        id: sessionData.id,
        phone: cleanPhone,
        expiresAt: expiresAt.toISOString(),
      });

      return {
        id: sessionData.id,
        phoneNumber: sessionData.phone_number,
        initiatedAt: new Date(sessionData.initiated_at),
        expiresAt: new Date(sessionData.expires_at),
        isActive: sessionData.is_active,
        organizationId: sessionData.organization_id,
        ticketId: sessionData.ticket_id,
        customerName: sessionData.customer_name,
      };
    } catch (error) {
      console.error("Error creating WhatsApp session:", error);
      return null;
    }
  }

  /**
   * Extend an existing session (reset 24-hour timer)
   */
  async extendSession(phoneNumber: string): Promise<boolean> {
    try {
      const cleanPhone = this.cleanPhoneNumber(phoneNumber);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

      const { error } = await supabase
        .from("whatsapp_sessions")
        .update({
          expires_at: expiresAt.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("phone_number", cleanPhone)
        .eq("is_active", true);

      if (error) {
        console.error("Error extending WhatsApp session:", error);
        return false;
      }

      console.log("Extended WhatsApp session for", cleanPhone);
      return true;
    } catch (error) {
      console.error("Error extending WhatsApp session:", error);
      return false;
    }
  }

  /**
   * Manually deactivate a session
   */
  async deactivateSession(phoneNumber: string): Promise<boolean> {
    try {
      const cleanPhone = this.cleanPhoneNumber(phoneNumber);

      const { error } = await supabase
        .from("whatsapp_sessions")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("phone_number", cleanPhone)
        .eq("is_active", true);

      if (error) {
        console.error("Error deactivating WhatsApp session:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error deactivating WhatsApp session:", error);
      return false;
    }
  }

  /**
   * Clean up expired sessions (run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = new Date();

      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .update({
          is_active: false,
          updated_at: now.toISOString(),
        })
        .eq("is_active", true)
        .lt("expires_at", now.toISOString())
        .select("id");

      if (error) {
        console.error("Error cleaning up expired sessions:", error);
        return 0;
      }

      const cleanedCount = data?.length || 0;
      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired WhatsApp sessions`);
      }

      return cleanedCount;
    } catch (error) {
      console.error("Error cleaning up expired sessions:", error);
      return 0;
    }
  }

  /**
   * Get all active sessions for an organization (admin view)
   */
  async getActiveSessionsForOrganization(
    organizationId: string
  ): Promise<WhatsAppSession[]> {
    try {
      const now = new Date();

      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .gt("expires_at", now.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error getting active sessions:", error);
        return [];
      }

      return data.map((session) => ({
        id: session.id,
        phoneNumber: session.phone_number,
        initiatedAt: new Date(session.initiated_at),
        expiresAt: new Date(session.expires_at),
        isActive: session.is_active,
        organizationId: session.organization_id,
        ticketId: session.ticket_id,
        customerName: session.customer_name,
      }));
    } catch (error) {
      console.error("Error getting active sessions:", error);
      return [];
    }
  }

  /**
   * Associate a session with a ticket
   */
  async associateWithTicket(
    phoneNumber: string,
    ticketId: string
  ): Promise<boolean> {
    try {
      const cleanPhone = this.cleanPhoneNumber(phoneNumber);

      const { error } = await supabase
        .from("whatsapp_sessions")
        .update({
          ticket_id: ticketId,
          updated_at: new Date().toISOString(),
        })
        .eq("phone_number", cleanPhone)
        .eq("is_active", true);

      if (error) {
        console.error("Error associating session with ticket:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error associating session with ticket:", error);
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private cleanPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters including the + sign to match database storage
    return phoneNumber.replace(/[^\d]/g, "");
  }

  private async deactivateExistingSessions(phoneNumber: string): Promise<void> {
    try {
      await supabase
        .from("whatsapp_sessions")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("phone_number", phoneNumber)
        .eq("is_active", true);
    } catch (error) {
      console.error("Error deactivating existing sessions:", error);
    }
  }
}

export const whatsappSessionService = WhatsAppSessionService.getInstance();

// Session cleanup utility - can be called periodically
export async function cleanupExpiredWhatsAppSessions() {
  return await whatsappSessionService.cleanupExpiredSessions();
}

// Helper function to check session status
export async function checkWhatsAppSessionStatus(phoneNumber: string) {
  const hasActive = await whatsappSessionService.hasActiveSession(phoneNumber);
  const session = hasActive
    ? await whatsappSessionService.getActiveSession(phoneNumber)
    : null;

  return {
    hasActiveSession: hasActive,
    session,
    timeRemaining: session ? session.expiresAt.getTime() - Date.now() : 0,
  };
}
