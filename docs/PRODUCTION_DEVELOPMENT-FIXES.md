# DEPLOYMENT FIXES FOR PRODUCTION ERRORS

## Issues Identified & Solutions

### 1. 🚨 Service Worker Cache Installation Failed

**Error**: `sw.js:26 Service Worker: Cache installation failed: TypeError: Failed to execute 'addAll' on 'Cache': Request failed`

**Root Cause**: Service worker trying to cache `/logo_s.png` which was deleted during logo updates

**✅ FIXED**:

- Updated `customer/public/sw.js` to cache `/Logo.svg` instead of `/logo_s.png`
- Updated cache name from `smart-queue-v2` to `smart-queue-v3` to force refresh
- Updated `customer/public/manifest.json` to reference correct logo paths

### 2. 🚨 Logo Resource 404 Error  

**Error**: `logo.svg:1 Failed to load resource: the server responded with a status of 404 ()`

**Root Cause**: References to old logo files in manifest.json and service worker

**✅ FIXED**:

- All logo references updated to use existing `/Logo.svg`
- Manifest.json icon references updated to SVG format
- Service worker cache list updated

### 3. 🚨 Database Query 406 Error (Not Acceptable)

**Error**: `xxaqztdwdjgrkdyfnjvr.supabase.co/rest/v1/tickets?select=ticket_number&service_id=eq.4ee18e25-b143-44b6-8093-93ab94651e01&status=eq.serving:1 Failed to load resource: the server responded with a status of 406 ()`

**Root Cause**: RLS (Row Level Security) policies blocking anonymous access to tickets table

**🔧 SOLUTION CREATED**: `sql/fix-customer-tickets-rls.sql`

- Creates policy allowing anonymous users to read ticket queue status
- Safe implementation - only exposes public queue information (ticket numbers, status)
- **⚠️ REQUIRES MANUAL EXECUTION** in Supabase Dashboard

### 4. 🚨 Push Notifications Not Working

**Potential Causes**:

1. Missing environment variables in deployment
2. Service worker installation failures (now fixed)
3. VAPID key configuration issues

**🔧 SOLUTIONS**:

1. Verify environment variables are set in production:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `NEXT_PUBLIC_ADMIN_URL`
2. Service worker fixes implemented above
3. Clear browser cache after deployment

## 📋 DEPLOYMENT CHECKLIST

### Immediate Actions Required

1. **✅ Deploy Code Changes**: Service worker and manifest fixes
2. **🔧 Execute SQL Script**: Run `sql/fix-customer-tickets-rls.sql` in Supabase
3. **🔧 Verify Environment Variables**: Check production environment has:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `NEXT_PUBLIC_ADMIN_URL`
4. **🧹 Clear Browser Cache**: Force refresh to load new service worker

### Testing After Fixes

1. ✅ Service Worker Installation (no cache errors)
2. ✅ Logo Loading (no 404 errors)  
3. ✅ Queue Status Display (no 406 errors)
4. ✅ Push Notification Registration
5. ✅ Push Notification Delivery

## 🎯 Expected Results After Fixes

- Service worker installs successfully without cache errors
- All logo resources load properly
- Queue status queries return data (current serving ticket)
- Push notifications register and deliver properly
- In-app notifications continue working as before

## 📝 Files Modified

- `customer/public/sw.js` - Fixed cache URLs and version
- `customer/public/manifest.json` - Updated logo references
- `sql/fix-customer-tickets-rls.sql` - NEW: RLS policy fix

## ⚠️ Critical Note

The SQL script **MUST** be executed manually in your Supabase dashboard for the 406 errors to be resolved. This cannot be done automatically through the application.
