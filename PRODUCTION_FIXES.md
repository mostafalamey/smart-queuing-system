# 🚨 VERCEL PRODUCTION DEPLOYMENT FIXES

## Issue: Customer App Freezing in Production (Vercel)

The customer app freezes during WhatsApp notification setup when deployed to Vercel, but works fine in development.

## Root Cause Analysis

1. **Admin App Missing Environment Variables** - The admin app deployed to Vercel lacks the required environment variables for WhatsApp API integration
2. **Cross-App Communication Timeout** - Customer app calls admin app APIs which fail due to missing configuration
3. **Session Check API Failures** - WhatsApp session validation fails in production due to missing UltraMessage credentials

## Required Vercel Environment Variables for Admin App

Add these environment variables to your Vercel admin app deployment:

### Supabase Configuration

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxaqztdwdjgrkdyfnjvr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YXF6dGR3ZGpncmtkeWZuanZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjkyNTYsImV4cCI6MjA3MDQ0NTI1Nn0.mr35VgacJYZTc35lAbn5KQ5BsV8ElucEp-Ekf_E63wg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YXF6dGR3ZGpncmtkeWZuanZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDg2OTI1NiwiZXhwIjoyMDcwNDQ1MjU2fQ.q3zsVFuZvT57-R5kOHFmYtdMWeSbfMzrSzy7-KlQ2eA
```

### UltraMessage WhatsApp API Configuration

```env
ULTRAMSG_INSTANCE_ID=instance140392
ULTRAMSG_TOKEN=hrub8q5j85dp0bgn
ULTRAMSG_WEBHOOK_TOKEN=your-webhook-token-here
ULTRAMSG_WEBHOOK_ENABLED=true
```

### WhatsApp Business Configuration

```env
WHATSAPP_BUSINESS_NUMBER=201015544028
WHATSAPP_COMPANY_NUMBER=201015544028
WHATSAPP_ENABLED=true
WHATSAPP_SESSION_DURATION_HOURS=24
```

### VAPID Keys for Push Notifications

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BGUReuLggRpU7vUmPZsDgFIxRtjmKmsObnNOP5mNL25WwQ4F1JtzBgxsuAaZHttM9QUpnw8WD1QaPSzCEvdDrO0
VAPID_PRIVATE_KEY=your-vapid-private-key-here
```

### Production URLs

```env
NEXT_PUBLIC_SITE_URL=https://smart-queue-admin.vercel.app
NEXT_PUBLIC_CUSTOMER_URL=https://smart-queue-customer.vercel.app
```

### Email Configuration (Optional)

```env
RESEND_API_KEY=your-resend-api-key-here
FROM_EMAIL=noreply@yourdomain.com
```

## Steps to Fix Production Deployment

### 1. Configure Vercel Environment Variables

Go to your Vercel dashboard:

1. Select your admin app project
2. Go to Settings → Environment Variables
3. Add all the variables listed above
4. Redeploy the admin app

### 2. Update UltraMessage Webhook URL

Update your UltraMessage webhook URL to point to production:

```url
https://smart-queue-admin.vercel.app/api/webhooks/ultramsg
```

### 3. Test Production Flow

1. Open customer app: <https://smart-queue-customer.vercel.app/?org=def924ee-c394-4772-8129-de7f818ecee9>
2. Create a ticket with WhatsApp notifications
3. Verify no freezing occurs
4. Check WhatsApp message delivery

## Immediate Debugging Commands

If you want to test the production admin app API directly:

```powershell
# Test admin app health
Invoke-RestMethod -Uri "https://smart-queue-admin.vercel.app/api/test/simple" -Method GET

# Test WhatsApp session check
$testSession = '{"phone":"201015544028","organizationId":"def924ee-c394-4772-8129-de7f818ecee9"}'
Invoke-RestMethod -Uri "https://smart-queue-admin.vercel.app/api/whatsapp/check-session" -Method POST -ContentType "application/json" -Body $testSession

# Test WhatsApp messaging
$testMessage = '{"phone":"201015544028","message":"Test from production","organizationId":"def924ee-c394-4772-8129-de7f818ecee9","ticketId":"test-ticket","notificationType":"test"}'
Invoke-RestMethod -Uri "https://smart-queue-admin.vercel.app/api/notifications/whatsapp" -Method POST -ContentType "application/json" -Body $testMessage
```

## Expected Results

After configuring the environment variables:

- ✅ Customer app will not freeze during WhatsApp setup
- ✅ WhatsApp session checks will work properly
- ✅ Notification messages will be delivered
- ✅ Complete queue flow will work in production
