# 🚀 Vercel Deployment Guide - Smart Queue System

## Prerequisites ✅

- [ ] GitHub repository with your code
- [ ] Vercel account connected to GitHub
- [ ] Supabase project running
- [ ] Build errors fixed (✅ COMPLETED)

## Deployment Strategy

This project uses a **monorepo approach** with two separate Next.js applications:

- **Admin Dashboard** (`/admin`) - Port 3001 locally
- **Customer App** (`/customer`) - Port 3002 locally

## 🔥 DEPLOYMENT STEPS

### Step 1: Prepare Your Repository

```bash
# Commit all changes
git add .
git commit -m "Fix Vercel configuration for separate app deployments"
git push origin main
```

### Step 2: Create Two Separate Vercel Projects

#### 2A. Deploy Admin Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"New Project"**
3. Import your GitHub repository
4. **Configure project settings:**
   - **Project Name**: `smart-queue-admin`
   - **Root Directory**: `admin`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

#### 2B. Deploy Customer App  

1. Create **another new project** in Vercel
2. Import the **same GitHub repository**
3. **Configure project settings:**
   - **Project Name**: `smart-queue-customer`  
   - **Root Directory**: `customer`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Step 3: Configure Environment Variables

#### For Admin Project

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxaqztdwdjgrkdyfnjvr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YXF6dGR3ZGpncmtkeWZuanZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjkyNTYsImV4cCI6MjA3MDQ0NTI1Nn0.mr35VgacJYZTc35lAbn5KQ5BsV8ElucEp-Ekf_E63wg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YXF6dGR3ZGpncmtkeWZuanZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDg2OTI1NiwiZXhwIjoyMDcwNDQ1MjU2fQ.q3zsVFuZvT57-R5kOHFmYtdMWeSbfMzrSzy7-KlQ2eA
NEXT_PUBLIC_SITE_URL=https://smart-queue-admin.vercel.app
NEXT_PUBLIC_CUSTOMER_URL=https://smart-queue-customer.vercel.app
```

#### For Customer Project

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxaqztdwdjgrkdyfnjvr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YXF6dGR3ZGpncmtkeWZuanZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjkyNTYsImV4cCI6MjA3MDQ0NTI1Nn0.mr35VgacJYZTc35lAbn5KQ5BsV8ElucEp-Ekf_E63wg
```

### Step 4: Update Production URLs (After Deployment)

Once deployed, you'll get URLs like:

- Admin: `https://smart-queue-admin-xyz.vercel.app`
- Customer: `https://smart-queue-customer-abc.vercel.app`

**Update these in your Admin project environment variables:**

```bash
NEXT_PUBLIC_SITE_URL=https://your-actual-admin-url.vercel.app
NEXT_PUBLIC_CUSTOMER_URL=https://your-actual-customer-url.vercel.app
```

### Step 5: Configure Custom Domains (Optional)

In Vercel project settings:

- Admin: `admin.your-domain.com`
- Customer: `app.your-domain.com` or `customer.your-domain.com`

## 🎯 EXPECTED RESULTS

After successful deployment:

### Admin Dashboard

- **URL**: `https://smart-queue-admin-xxx.vercel.app`
- **Features**: Login, dashboard, organization management, QR generation
- **QR Codes**: Will point to your customer app URL

### Customer App  

- **URL**: `https://smart-queue-customer-xxx.vercel.app`
- **Features**: Queue joining, real-time updates, mobile-optimized

## 🔧 TROUBLESHOOTING

### Common Issues

1. **Build Failures**: ✅ Fixed - Suspense boundaries added
2. **Environment Variables**: Make sure all vars are set in Vercel dashboard
3. **CORS Issues**: Update Supabase URL restrictions if needed
4. **QR Code Links**: Update URLs after getting production domains

### Debug Steps

1. Check Vercel build logs
2. Verify environment variables in Vercel dashboard  
3. Test database connectivity
4. Check browser console for client-side errors

## ✅ POST-DEPLOYMENT CHECKLIST

- [ ] Admin dashboard loads and login works
- [ ] Customer app loads with QR parameters
- [ ] Database operations function correctly
- [ ] QR codes point to correct customer URL
- [ ] Real-time updates work in production
- [ ] Email invitations work (if configured)
- [ ] Mobile responsiveness verified
- [ ] Push notifications functioning correctly
- [ ] Animated in-app notification popups working
- [ ] Service worker message passing operational

## 🚀 NEXT STEPS

1. **Custom Domain Setup**
2. **SSL Certificate Verification**
3. **Performance Monitoring**
4. **Production Testing**
5. **User Acceptance Testing**

---

**Your Smart Queue System is ready for production! 🎉***
