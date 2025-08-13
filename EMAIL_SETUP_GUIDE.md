# Email Invitation Setup Guide

## 🎯 **Current Status:**

The invitation system creates pending member records but doesn't send actual emails yet.

## 🔧 **To Enable Real Email Invitations:**

### **Option 1: Supabase Auth Invitations (Recommended)**

1. **Enable Email Auth in Supabase:**
   - Go to your Supabase Dashboard → Authentication → Settings
   - Enable "Enable email confirmations"
   - Configure email templates under "Email Templates"

2. **Set up SMTP (Required for invitations):**
   - In Supabase Dashboard → Settings → Auth
   - Configure SMTP settings with your email provider:
     - **Gmail**: Use App Passwords
     - **SendGrid**: Use API key
     - **Mailgun**: Use SMTP credentials

3. **Create Service Role Key:**
   - Go to Settings → API
   - Copy the `service_role` key (keep it secret!)
   - Add to your `.env.local`:

     ```env
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
     ```

4. **Update Supabase Client:**
   Create a server-side client for admin operations.

### **Option 2: Third-party Email Service**

1. **Resend (Simple):**

   ```bash
   npm install resend
   ```

2. **SendGrid:**

   ```bash
   npm install @sendgrid/mail
   ```

3. **Nodemailer (Flexible):**

   ```bash
   npm install nodemailer
   ```

## 🚀 **Quick Setup - Resend Integration:**

1. **Install Resend:**

   ```bash
   npm install resend
   ```

2. **Get Resend API Key:**
   - Sign up at resend.com
   - Get your API key
   - Add to `.env.local`:

     ```env
     RESEND_API_KEY=re_your_api_key_here
     ```

3. **Create API Route:**
   Create `/api/invite-member` endpoint to send emails server-side.

## 📧 **Current Workaround:**

The system creates pending invitations. You can manually send users:

- Registration link: `${window.location.origin}/register?org=${orgId}&email=${email}`
- Include their assigned role and organization details

## ✅ **Next Steps:**

1. Choose email provider (Resend recommended for simplicity)
2. Set up API keys
3. Create server-side email sending endpoint
4. Update invitation flow to call the email API

Would you like me to implement the Resend integration or another email service?
