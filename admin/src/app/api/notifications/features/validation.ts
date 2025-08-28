import { NextRequest } from "next/server";
import { NotificationRequest, NotificationError } from "./types";

export class ValidationService {
  static validateRequest(body: any): {
    isValid: boolean;
    data?: NotificationRequest;
    error?: NotificationError;
  } {
    const {
      organizationId,
      ticketId,
      customerPhone,
      notificationType,
      payload,
    } = body;

    // Check required fields
    const missingFields = [];
    if (!organizationId) missingFields.push("organizationId");
    if (!ticketId) missingFields.push("ticketId");
    if (!customerPhone) missingFields.push("customerPhone");
    if (!notificationType) missingFields.push("notificationType");
    if (!payload) missingFields.push("payload");

    if (missingFields.length > 0) {
      return {
        isValid: false,
        error: {
          error: "Missing required fields",
          details: JSON.stringify({
            organizationId: organizationId ? "present" : "missing",
            ticketId: ticketId ? "present" : "missing",
            customerPhone: customerPhone ? "present" : "missing",
            payload: payload ? "present" : "missing",
            notificationType: notificationType ? "present" : "missing",
          }),
        },
      };
    }

    // Validate notification type
    const validTypes = [
      "ticket_created",
      "almost_your_turn",
      "your_turn",
      "ticket_cancelled",
      "queue_update",
    ];
    if (!validTypes.includes(notificationType)) {
      return {
        isValid: false,
        error: {
          error: "Invalid notification type",
          details: `Must be one of: ${validTypes.join(", ")}`,
        },
      };
    }

    return {
      isValid: true,
      data: {
        organizationId,
        ticketId,
        customerPhone,
        notificationType,
        payload,
      },
    };
  }

  static async parseRequestBody(request: NextRequest): Promise<any> {
    try {
      return await request.json();
    } catch (error) {
      throw new Error("Invalid JSON in request body");
    }
  }
}
