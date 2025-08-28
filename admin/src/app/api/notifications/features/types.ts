// Notification system types and interfaces

export interface NotificationRequest {
  organizationId: string;
  ticketId: string;
  customerPhone?: string;
  notificationType: NotificationType;
  payload?: Record<string, any>;
}

export type NotificationType =
  | "ticket_created"
  | "almost_your_turn"
  | "your_turn"
  | "ticket_cancelled"
  | "queue_update";

export interface NotificationPreferences {
  id: string;
  phone: string;
  push_enabled: boolean;
  whatsapp_fallback: boolean;
  created_at: string;
  updated_at: string;
}

export interface PushSubscription {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  organization_id: string;
  phone?: string;
  ticket_id?: string;
  is_active: boolean;
}

export interface TicketData {
  ticket_number: string;
  departments: {
    name: string;
    branches: {
      name: string;
      organizations: {
        name: string;
      };
    };
  };
}

export interface WhatsAppResult {
  attempted: boolean;
  success: boolean;
  phone?: string;
  error?: string;
  messageId?: string;
  fallbackUsed?: boolean;
}

export interface PushResult {
  success: boolean;
  error?: string;
  endpoint: string;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  results?: {
    total: number;
    success: number;
    failed: number;
    details: PushResult[];
  };
  whatsappFallback?: WhatsAppResult;
  shouldFallback?: boolean;
}

export interface NotificationError {
  error: string;
  details?: string;
  migrationRequired?: boolean;
}
