# 🚀 Vercel Deployment Guide - Email Setup

## 📧 **Email Service Configuration**

Your system uses **Resend** for email delivery. Here are your options:

### **Current Setup: Resend Free**

- ✅ **Unlimited emails**: No daily limits
- ⚠️ **Domain restrictions**: Can only send to verified emails
- ✅ **Already configured**: Ready to deploy
- 💰 **Upgrade option**: $20/month for sending to any email

#### **How It Works:**

- Your current setup can send emails to `mlamey@outlook.com`
- For production use, you can either:
  1. Add more verified emails in your Resend dashboard
  2. Upgrade to Resend Pro for $20/month to send to any email
  3. Set up a custom domain (free with Resend)

### **To Add More Email Recipients (Free):**

1. Go to: <https://resend.com/domains>
2. Add recipients to your verified list
3. Each person can receive invitations

### **To Enable Any Email Address:**

1. **Option A**: Upgrade to Resend Pro ($20/month)

   - Go to: <https://resend.com/settings/billing>
   - Upgrade your plan
   - Can send to any email address

2. **Option B**: Add Custom Domain (Free)
   - Go to: <https://resend.com/domains>
   - Add your custom domain (e.g., `yourdomain.com`)
   - Complete DNS verification
   - Use `noreply@yourdomain.com` as FROM_EMAIL

---

## 🔧 **Vercel Deployment Steps**

### **1. Prepare for Deployment**

```bash
cd d:\ACS\smart-queuing-system\admin
npm run build  # Test build locally
```

### **2. Deploy to Vercel**

```bash
vercel --prod
```

### **3. Set Environment Variables**

In Vercel Dashboard:

1. Go to your project → Settings → Environment Variables
2. Add each variable from `.env.vercel` file:

```bash
# Required for Resend
RESEND_API_KEY=re_ffPHyQg7_71zHgqxkeKwFykhVg44LyUhV
FROM_EMAIL=onboarding@resend.dev

# Your Supabase keys
NEXT_PUBLIC_SUPABASE_URL=https://xxaqztdwdjgrkdyfnjvr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Update after deployment
NEXT_PUBLIC_SITE_URL=https://your-actual-domain.vercel.app
NEXT_PUBLIC_CUSTOMER_URL=https://your-customer-app.vercel.app
```

### **4. Update URLs After Deployment**

Once deployed, update these variables with your actual Vercel URLs:

```bash
NEXT_PUBLIC_SITE_URL=https://your-actual-domain.vercel.app
NEXT_PUBLIC_CUSTOMER_URL=https://your-customer-app.vercel.app
```

---

## 🧪 **Testing Email After Deployment**

1. **Deploy the app**
2. **Test invitation** with your verified email (`mlamey@outlook.com`)
3. **Verify email delivery**
4. **Add more recipients** or upgrade plan as needed

---

## 💡 **Recommendations**

### **For Development/Testing:**

- ✅ Current setup works perfectly
- Can invite `mlamey@outlook.com` and other verified emails

### **For Production:**

- **Option 1**: Add custom domain to Resend (free)
- **Option 2**: Upgrade to Resend Pro ($20/month)
- **Option 3**: Add specific emails to verified list (free)

---

## 🎯 **Current Status**

Your invitation system is **production-ready** with Resend! 🎉

| Service             | Cost      | Email Limits | Send to Any Email                |
| ------------------- | --------- | ------------ | -------------------------------- |
| **Resend Free**     | Free      | Unlimited    | ❌ Only verified emails          |
| **Resend Pro**      | $20/month | Unlimited    | ✅ Any email address             |
| **Resend + Domain** | Free      | Unlimited    | ✅ Any email (with domain setup) |

**Current Status**: Ready to deploy with existing Resend configuration!
