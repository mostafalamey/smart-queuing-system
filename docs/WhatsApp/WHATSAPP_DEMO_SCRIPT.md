# WhatsApp Inbound-First Integration Demo Script

## Demo Overview

This script demonstrates the complete WhatsApp inbound-first integration including customer opt-in flow and session-based messaging.

## Prerequisites

- Admin app running on <http://localhost:3001>
- Customer app running on <http://localhost:3002>
- UltraMessage webhook configured and accessible

## Demo Steps

### 1. Customer Flow Demo

#### Step 1: Access Customer App

```url
URL: http://localhost:3002
```

#### Step 2: Complete Customer Journey

1. **Phone Input**: Enter `+201015544028` (your WhatsApp Business number)
2. **Service Selection**: Choose any available service
3. **WhatsApp Opt-In** (NEW):
   - See two options: "Enable WhatsApp" vs "Continue Without"
   - Click "Enable WhatsApp Notifications"
   - Notice WhatsApp opens with pre-written message to +201015544028
   - **Send the message** to create an active session
   - Return to browser and click "Continue"

#### Step 3: Ticket Creation

- Ticket is created with WhatsApp preference stored
- Confirmation shows: "We'll send you WhatsApp updates" or "Push notifications only"

### 2. WhatsApp Session Testing

#### Test 1: Send Message Without Active Session (Should Block)

```powershell
# Test with a different number that has no active session
$testMessage = @{
    phone = "966555123456"
    message = "⚠️ Test: Your turn! Ticket: A001"
    organizationId = "test-org"
    ticketId = "test-ticket-123"
    notificationType = "your_turn"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/notifications/whatsapp" -Method POST -ContentType "application/json" -Body $testMessage
```

**Expected Response**:

```json
{
  "success": false,
  "reason": "no_active_session",
  "compliance": "Inbound-first policy - prevents unsolicited messages"
}
```

#### Test 2: Activate Session by Sending WhatsApp Message

1. Go to WhatsApp (web or mobile)
2. **Send a message to +201015544028** (your UltraMessage connected number)
3. Send any message like: "Hi! I'd like to receive notifications for my queue ticket."
4. Wait 2-3 seconds for webhook processing

#### Test 3: Send Message With Active Session (Should Allow)

```powershell
# Test with the same number that just sent the WhatsApp message
$testMessage2 = @{
    phone = "201015544028"
    message = "✅ Your turn! Ticket: A001. Please proceed to Customer Service."
    organizationId = "test-org"
    ticketId = "test-ticket-123"
    notificationType = "your_turn"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/notifications/whatsapp" -Method POST -ContentType "application/json" -Body $testMessage2
```

**Expected Response**:

```json
{
  "success": true,
  "messageId": 42
}
```

### 3. Session Management Demo

#### Check Active Sessions

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/test/whatsapp-sessions" -Method GET
```

**Expected Response**:

```json
{
  "success": true,
  "phoneStatus": {
    "966555123456": {
      "hasActiveSession": true,
      "lastMessageAt": "2025-08-26T20:30:00.000Z",
      "sessionExpiresAt": "2025-08-27T20:30:00.000Z"
    }
  }
}
```

## Demo Key Points to Highlight

### 1. Compliance Protection

- ✅ **Before WhatsApp message**: API blocks notification sending
- ✅ **After WhatsApp message**: API allows notification sending
- ✅ **24-hour window**: Session expires automatically

### 2. Customer Experience

- ✅ **Clear opt-in choice**: WhatsApp vs Push notifications
- ✅ **Pre-written message**: Ensures proper session activation
- ✅ **Cross-platform**: Works on mobile and desktop
- ✅ **No forced WhatsApp**: Customer can skip and use push notifications

### 3. Technical Architecture

- ✅ **Inbound webhook**: Processes customer messages to create sessions
- ✅ **Session validation**: Every outbound message checked against active sessions
- ✅ **Database persistence**: Sessions stored with expiration times
- ✅ **Automatic cleanup**: Expired sessions removed automatically

## Troubleshooting

### If WhatsApp Link Doesn't Open

- Check if WhatsApp is installed
- Try the link manually: `https://wa.me/966140392?text=Hi%20WhatsApp%20Test%20Org!...`

### If Session Not Created

- Check webhook endpoint: `http://localhost:3001/api/webhooks/ultramsg/inbound`
- Verify UltraMessage webhook configuration
- Check admin terminal for webhook logs

### If Message Blocked

- Confirm session exists: Call sessions test endpoint
- Check phone number format (no + prefix in API calls)
- Verify 24-hour window hasn't expired

## Success Criteria

- ✅ Customer can opt-in to WhatsApp notifications
- ✅ WhatsApp deep link opens correctly
- ✅ Session created when customer sends message
- ✅ API blocks messages without active sessions
- ✅ API allows messages with active sessions
- ✅ Customer receives confirmation message on WhatsApp

## Demo Complete

This demonstrates the complete inbound-first WhatsApp integration that complies with WhatsApp Business API policies while providing excellent customer experience.
