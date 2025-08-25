# Notification Logs Cleanup Options - Comprehensive Analysis

## 📊 Current Situation Analysis

Your `notification_logs` table grows with every push notification sent:

- ✅ **Ticket Created**: Customer creates ticket → notification → log entry
- ✅ **Almost Your Turn**: 3 tickets away → notification → log entry  
- ✅ **Your Turn**: Customer's turn → notification → log entry
- ✅ **Each entry stores**: ticket_id, phone, notification_type, delivery_method, success/error status

**Without cleanup, this table will grow indefinitely and impact performance.**

---

## 🎯 Recommended Solutions (All Options)

### **Option 1: Immediate Cleanup After Delivery (BEST)**

**Approach**: Delete successful notifications immediately after delivery confirmation

```sql
-- Run: sql/notification-logs-immediate-cleanup.sql
SELECT cleanup_notification_logs(5, 7); -- Keep successful 5 min, failed 7 days
```

**✅ Pros:**

- Keeps table size minimal
- Only retains error logs for debugging
- Fastest performance impact

**❌ Cons:**

- No historical data for successful deliveries
- Requires modification to notification workflow

---

### **Option 2: Batch Cleanup with Retention (RECOMMENDED)**

**Approach**: Keep logs for configurable periods, then clean in batches

```sql
-- Run: sql/notification-logs-batch-cleanup.sql
SELECT batch_cleanup_notification_logs(1, 3, false, 1000); -- 1hr success, 3 days failed
```

**✅ Pros:**

- Configurable retention periods
- Preserves debugging data
- Progressive cleanup based on table size
- Batch processing prevents performance impact

**❌ Cons:**

- Requires periodic execution
- More complex configuration

---

### **Option 3: Integrate with Existing Ticket Cleanup (SEAMLESS)**

**Approach**: Extend your current ticket cleanup system to include notifications

```sql
-- Run: sql/notification-logs-integrated-cleanup.sql
SELECT cleanup_old_tickets_with_notifications(24, true, true, 2);
```

**✅ Pros:**

- Uses your existing cleanup infrastructure
- Unified management interface
- Already integrated with TicketCleanupManager
- Consistent with current workflow

**❌ Cons:**

- Notification cleanup tied to ticket cleanup schedule
- Less granular control

---

### **Option 4: Admin Dashboard Management (USER-FRIENDLY)**

**Approach**: Full admin interface for manual and automated cleanup

```sql
-- Run: sql/notification-logs-admin-interface.sql
-- Then add: admin/src/components/NotificationCleanupManager.tsx
```

**✅ Pros:**

- Visual management interface
- Organization-specific cleanup
- Dry-run capabilities
- Emergency cleanup options
- Real-time statistics and recommendations

**❌ Cons:**

- Requires UI development
- Manual intervention needed

---

### **Option 5: Automated Cleanup in App Code**

**Approach**: Modify your notification API to auto-cleanup after sending

```typescript
// In admin/src/app/api/notifications/push/route.ts
// Add cleanup call after logging notification
await cleanupOldNotifications()
```

**✅ Pros:**

- Automatic, no manual intervention
- Real-time cleanup
- No additional SQL jobs needed

**❌ Cons:**

- Adds processing time to notification sending
- Requires code modifications

---

## 🚀 Implementation Recommendations

### **For Immediate Relief (TODAY)**

- **Run Emergency Cleanup**:

  ```sql
  -- Get current table size
  SELECT COUNT(*), pg_size_pretty(pg_total_relation_size('notification_logs')) 
  FROM notification_logs;

  -- Emergency cleanup (if table is huge)
  SELECT emergency_cleanup_all_notifications(true);
  ```

- **Implement Option 3** (Integrated Cleanup):
   1. ✅ Extends your existing system
   2. ✅ Requires minimal changes  
   3. ✅ Works with current admin interface

### **For Long-term Solution (THIS WEEK)**

1. **Implement Option 2** (Batch Cleanup) + **Option 4** (Admin Interface):
   - Configure retention periods per your business needs
   - Add admin UI for monitoring and manual control
   - Set up automated cleanup schedule

### **Retention Recommendations by Business Volume**

| Business Type | Successful Logs | Failed Logs | Reasoning |
|---------------|-----------------|-------------|-----------|
| **High Volume** (1000+/day) | 5 minutes | 24 hours | Minimal retention, fast cleanup |
| **Medium Volume** (100-1000/day) | 1 hour | 3 days | Short retention for debugging |
| **Low Volume** (<100/day) | 6 hours | 7 days | Longer retention, less impact |

---

## 📋 Step-by-Step Implementation Guide

### Step 1: Choose Your Approach

```bash
# For integrated approach (recommended):
cd d:\ACS\smart-queuing-system
```

### Step 2: Run Database Setup

```sql
-- In Supabase SQL Editor, run ONE of these:
-- Option 1: \i sql/notification-logs-immediate-cleanup.sql
-- Option 2: \i sql/notification-logs-batch-cleanup.sql  
-- Option 3: \i sql/notification-logs-integrated-cleanup.sql ← RECOMMENDED
-- Option 4: \i sql/notification-logs-admin-interface.sql
```

### Step 3: Add Admin Interface (Optional)

```typescript
// Add to your admin dashboard:
import NotificationCleanupManager from '@/components/NotificationCleanupManager'

// In your dashboard page:
<NotificationCleanupManager className="mt-8" />
```

### Step 4: Set Up Automation

```sql
-- For integrated approach, your existing cleanup already handles it!
-- For others, set up pg_cron or call from your app:

-- Every hour cleanup
SELECT cron.schedule('notification-cleanup', '0 * * * *', 
  'SELECT batch_cleanup_notification_logs(1, 3, false, 1000);'
);
```

### Step 5: Monitor and Adjust

```sql
-- Check cleanup effectiveness:
SELECT * FROM notification_logs_stats;
SELECT * FROM get_notification_cleanup_recommendation();
```

---

## ⚡ Quick Start (5 Minutes)

**Most users should start with Option 3 (Integrated):**

- **Run this SQL in Supabase**:

```sql
-- Copy and paste from: sql/notification-logs-integrated-cleanup.sql
```

- **Your existing cleanup will now handle notifications automatically!**

- **Test it**:

```sql
SELECT cleanup_old_tickets_with_notifications(24, true, true, 2);
```

- **Done!** Your notification logs will now be cleaned up alongside tickets.

---

## 🔍 Monitoring Queries

```sql
-- Check current table size
SELECT 
    COUNT(*) as total_logs,
    COUNT(CASE WHEN push_success = true THEN 1 END) as successful,
    COUNT(CASE WHEN push_success = false THEN 1 END) as failed,
    pg_size_pretty(pg_total_relation_size('notification_logs')) as table_size
FROM notification_logs;

-- Get cleanup recommendations  
SELECT * FROM get_notification_cleanup_recommendation();

-- View organization-wise statistics
SELECT * FROM notification_logs_dashboard;
```

---

## 🚨 Emergency Commands

If your table becomes too large:

```sql
-- EMERGENCY: Delete all notification logs
SELECT emergency_cleanup_all_notifications(true);

-- SAFER: Delete only old successful notifications
DELETE FROM notification_logs 
WHERE push_success = true 
AND created_at < NOW() - INTERVAL '1 hour';

-- PROGRESSIVE: Clean by organization
SELECT cleanup_organization_notifications(
    'your-org-id-here', 
    true,  -- cleanup successful
    false, -- keep failed for debugging  
    1      -- older than 1 hour
);
```

---

## 💡 Best Practices

1. **Start Conservative**: Keep failed logs longer for debugging
2. **Monitor Performance**: Check query times before/after cleanup  
3. **Test First**: Always use dry-run options
4. **Document Settings**: Keep track of your retention policies
5. **Regular Reviews**: Adjust retention periods based on usage patterns

---

## 🔧 Files Created

- ✅ `sql/notification-logs-immediate-cleanup.sql` - Immediate deletion approach
- ✅ `sql/notification-logs-batch-cleanup.sql` - Batch cleanup with retention  
- ✅ `sql/notification-logs-integrated-cleanup.sql` - Extends existing cleanup
- ✅ `sql/notification-logs-admin-interface.sql` - Admin management functions
- ✅ `admin/src/components/NotificationCleanupManager.tsx` - Admin UI component

**Choose the approach that best fits your workflow and implement today!**
