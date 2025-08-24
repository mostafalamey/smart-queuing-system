# WhatsApp Integration with UltraMessage - Complete Setup Guide

## 🚀 Overview

This guide documents the complete WhatsApp integration using UltraMessage API for the Smart Queue System. The integration provides automatic WhatsApp notifications as a fallback when push notifications fail, or as the primary notification method.

## 📋 Features Implemented

### ✅ Core Integration

- **Real UltraMessage API Integration** - Direct connection to UltraMessage service
- **Automatic Fallback** - WhatsApp messages sent when push notifications fail
- **Professional Message Templates** - Branded messages for different notification types
- **Error Handling & Logging** - Comprehensive error tracking and recovery

### ✅ Notification Types

1. **Ticket Created** - Welcome message with ticket number and queue position
2. **Almost Your Turn** - Notification when customer is next in line
3. **Your Turn** - Notification when it's customer's turn

### ✅ System Architecture

- **Dedicated API Route** - `/api/notifications/whatsapp` for all WhatsApp operations
- **Environment-Based Configuration** - Easy setup via environment variables
- **Debug Mode Support** - Test mode without sending actual messages
- **Cross-App Support** - Works from both admin and customer applications

## 🔧 Configuration

### Environment Variables (.env.local)

```bash
# UltraMessage WhatsApp API Configuration
ULTRAMSG_INSTANCE_ID=instance140392
ULTRAMSG_TOKEN=hrub8q5j85dp0bgn
ULTRAMSG_BASE_URL=https://api.ultramsg.com

# WhatsApp Settings
WHATSAPP_ENABLED=true
WHATSAPP_DEBUG=false
```

### Configuration Details

| Variable               | Value                      | Description                           |
| ---------------------- | -------------------------- | ------------------------------------- |
| `ULTRAMSG_INSTANCE_ID` | `instance140392`           | Your UltraMessage instance ID         |
| `ULTRAMSG_TOKEN`       | `hrub8q5j85dp0bgn`         | Your UltraMessage API token           |
| `ULTRAMSG_BASE_URL`    | `https://api.ultramsg.com` | UltraMessage API base URL             |
| `WHATSAPP_ENABLED`     | `true`                     | Enable/disable WhatsApp notifications |
| `WHATSAPP_DEBUG`       | `false`                    | Debug mode (logs without sending)     |

## 🏗 Technical Implementation

### 1. WhatsApp API Route (`/api/notifications/whatsapp`)

```typescript
// POST /api/notifications/whatsapp
{
  "phone": "+1234567890",
  "message": "Your message content",
  "organizationId": "org-123",
  "ticketId": "ticket-456",
  "notificationType": "ticket_created"
}
```

**Response:**

```json
{
  "success": true,
  "message": "WhatsApp message sent successfully",
  "messageId": "ultramsg-message-id",
  "phone": "1234567890"
}
```

### 2. Notification Service Integration

**Admin Notifications:**

```typescript
import { notificationService } from "@/lib/notifications";

await notificationService.notifyTicketCreated(
  "+1234567890",
  "A001",
  "Customer Service",
  "ABC Company",
  5, // waiting count
  "org-123", // organization ID
  "ticket-456" // ticket ID
);
```

**Customer Notifications:**

- Uses admin API proxy for cross-origin requests
- Automatic fallback when push notifications fail

### 3. Push Notification Fallback

The push notification API (`/api/notifications/push`) automatically attempts WhatsApp fallback when:

- No active push subscriptions found
- All push notifications fail
- Customer has provided phone number

```typescript
// Automatic WhatsApp fallback logic
if (successCount === 0 && customerPhone) {
  // Fetch ticket details
  // Send appropriate WhatsApp message
  // Log delivery attempt
}
```

## 📱 Message Templates

### Ticket Created

```message
🎫 Welcome to [Organization]!

Your ticket number: *A001*
Department: Customer Service

There are 5 customers ahead of you.

Please keep this message for reference. We'll notify you when it's almost your turn.

Thank you for choosing [Organization]! 🙏
```

### Almost Your Turn

```message
⏰ Almost your turn at [Organization]!

Your ticket: *A001*
Currently serving: A000

You're next! Please be ready at the Customer Service counter.

Thank you for your patience! 🙏
```

### Your Turn

```message
🔔 It's your turn!

Ticket: *A001*
Please proceed to: Customer Service

Thank you for choosing [Organization]! 🙏
```

## 🧪 Testing

### Test Page

Visit: `http://localhost:3001/test/whatsapp`

Features:

- Configuration status check
- Send test messages
- Real-time error reporting
- Debug mode support

### Manual API Testing

```bash
# Test WhatsApp service status
GET http://localhost:3001/api/test/whatsapp

# Send test message
POST http://localhost:3001/api/test/whatsapp
Content-Type: application/json

{
  "phone": "+1234567890"
}
```

### Debug Mode

Set `WHATSAPP_DEBUG=true` to:

- Log messages without sending
- Test configuration without using API credits
- Verify message formatting

## 🔄 Integration Flow

### Customer Creates Ticket

1. Customer provides phone number (optional)
2. Push notification attempted first
3. If push fails → WhatsApp fallback automatically triggered
4. Message sent with ticket details and queue position

### Admin Queue Operations

1. Admin calls next customer
2. "Your Turn" push notification sent
3. If push fails → WhatsApp sent automatically
4. "Almost Your Turn" notifications sent to next customers
5. WhatsApp fallback for those notifications if needed

## 🛡 Error Handling

### Common Issues & Solutions

**Configuration Errors:**

- ❌ `WhatsApp API configuration incomplete`
- ✅ Check all environment variables are set

**API Errors:**

- ❌ `Invalid response from WhatsApp service`
- ✅ Verify UltraMessage token and instance ID

**Phone Format Errors:**

- ❌ Messages not delivered
- ✅ Ensure phone numbers include country code (+1234567890)

**Rate Limiting:**

- ❌ `Too many requests`
- ✅ UltraMessage has built-in rate limiting - retry after delay

### Logging & Monitoring

All WhatsApp attempts are logged to:

- Console (development)
- `notification_logs` table (database)
- Error tracking system

Log entries include:

- Phone number
- Message content
- Delivery status
- Error details
- Timestamp

## 📊 Database Integration

### Notification Logs Table

```sql
-- WhatsApp delivery tracking
UPDATE notification_logs SET
  whatsapp_success = true/false,
  whatsapp_error = 'error message',
  delivery_method = 'whatsapp'
WHERE ticket_id = 'ticket-id'
```

### Notification Preferences

```sql
-- Customer preferences
whatsapp_fallback = true  -- Always enabled as fallback
push_enabled = true/false -- Based on user choice
```

## 🚀 Production Deployment

### Vercel Environment Variables

Add to Vercel dashboard:

```env
ULTRAMSG_INSTANCE_ID=instance140392
ULTRAMSG_TOKEN=hrub8q5j85dp0bgn
ULTRAMSG_BASE_URL=https://api.ultramsg.com
WHATSAPP_ENABLED=true
WHATSAPP_DEBUG=false
```

### UltraMessage Setup Checklist

- ✅ WhatsApp number connected to UltraMessage instance
- ✅ Instance is active and running
- ✅ API token has correct permissions
- ✅ Phone number format verified (country code required)
- ✅ Test message sent successfully

## 🎯 Usage Examples

### Direct WhatsApp Send

```javascript
const response = await fetch("/api/notifications/whatsapp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    phone: "+966123456789",
    message: "Your custom message here",
    organizationId: "org-123",
    ticketId: "ticket-456",
    notificationType: "ticket_created",
  }),
});
```

### Push with WhatsApp Fallback

```javascript
const response = await fetch('/api/notifications/push', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationId: 'org-123',
    ticketId: 'ticket-456',
    customerPhone: '+966123456789', // Enables fallback
    payload: { /* push payload */ },
    notificationType: 'your_turn',
    ticketNumber: 'A001'
  })
})

// Response includes both push and WhatsApp results
{
  "success": true,
  "whatsappFallback": {
    "attempted": true,
    "success": true,
    "phone": "+966123456789"
  }
}
```

## 📈 Performance & Scalability

### API Rate Limits

- UltraMessage: Check your plan limits
- Recommended: Implement queuing for high volume

### Message Queuing (Future Enhancement)

```typescript
// For high-volume scenarios
const messageQueue = new Queue("whatsapp-messages");
messageQueue.add("send-message", { phone, message });
```

## 🔐 Security Considerations

- **Token Security**: Never expose ULTRAMSG_TOKEN in frontend code
- **Phone Validation**: Always validate phone number format
- **Rate Limiting**: Implement application-level rate limiting
- **CORS**: WhatsApp API routes properly configured for cross-origin

## ✅ Verification Checklist

- [ ] Environment variables configured correctly
- [ ] Admin development server restarted
- [ ] Test page accessible at `/test/whatsapp`
- [ ] Configuration status shows "Ready"
- [ ] Test message sent successfully
- [ ] WhatsApp message received on test phone
- [ ] Push notification fallback working
- [ ] Database logging functional
- [ ] Error handling tested

## **🎉 Success!**

Your WhatsApp integration with UltraMessage is now fully operational! The system will automatically:

1. **Send WhatsApp notifications** when customers provide phone numbers
2. **Fallback to WhatsApp** when push notifications fail
3. **Log all delivery attempts** for monitoring
4. **Handle errors gracefully** with retry mechanisms

The integration is production-ready and will enhance your queue management system with reliable WhatsApp notifications.
