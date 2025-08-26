# Database Cleanup Function - Fixed

## What was wrong?

The main issue with the Supabase edge function was in the database relationship handling:

1. **Incorrect relationship query**: The function was trying to query `departments` table with `organization_id` directly, but departments are linked to organizations through branches:

   - Organizations → Branches (`organization_id`)
   - Branches → Departments (`branch_id`)
   - Departments → Tickets (`department_id`)

2. **Non-organization-aware RPC function**: The existing `cleanup_old_tickets_with_notifications` RPC function cleans ALL tickets across ALL organizations, not just the specified one.

## What was fixed?

### 1. Fixed Database Relationship Query

**Before:**

```typescript
const { data: departments, error: deptError } = await supabase
  .from("departments")
  .select("id")
  .eq("organization_id", organizationId); // ❌ departments don't have organization_id
```

**After:**

```typescript
// First get branches for this organization
const { data: branches, error: branchError } = await supabase
  .from("branches")
  .select("id")
  .eq("organization_id", organizationId);

// Then get departments for these branches
const { data: departments, error: deptError } = await supabase
  .from("departments")
  .select("id")
  .in("branch_id", branchIds);
```

### 2. Disabled Non-Organization-Aware RPC

The function now uses direct queries instead of the global RPC function to ensure organization-specific cleanup.

### 3. Added Comprehensive Logging

Added detailed logging to help debug issues:

- Branch and department discovery
- Ticket selection and filtering
- Archive and delete operations
- Error reporting

## How to test the fix

### 1. Deploy the function

```powershell
supabase functions deploy cleanup-database --project-ref xxaqztdwdjgrkdyfnjvr
```

### 2. Test with dry run (recommended first)

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-database" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": true,
    "cleanupType": "tickets",
    "ticketRetentionHours": 1,
    "adminKey": "cleanup-admin-2025"
  }'
```

### 3. Use the PowerShell test script

```powershell
# Set environment variables
$env:SUPABASE_PROJECT_REF = "your-project-ref"
$env:SUPABASE_ANON_KEY = "your-anon-key"

# Run the test
.\test-cleanup-function.ps1
```

### 4. Test with specific organization

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-database" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "your-org-uuid",
    "dryRun": false,
    "cleanupType": "both",
    "ticketRetentionHours": 24,
    "adminKey": "cleanup-admin-2025"
  }'
```

## Expected behavior now

1. **Organization-aware**: Only cleans tickets belonging to the specified organization
2. **Proper relationship traversal**: Correctly finds departments through branches
3. **Detailed logging**: Shows exactly what's happening at each step
4. **Safe defaults**: Uses dry-run and proper error handling
5. **Comprehensive cleanup**: Handles both tickets and notifications separately

## Monitoring the logs

After running the function, check the Supabase logs to see the detailed output:

```bash
supabase functions logs cleanup-database --project-ref YOUR_PROJECT_REF
```

You should see logs like:

- "Starting direct ticket cleanup for organization xxx"
- "Found X branches for organization xxx"
- "Found X departments for organization xxx"
- "Found X old tickets to clean up for organization xxx"
- "Successfully archived X tickets"
- "Successfully deleted X tickets"

## Common issues to check

1. **No tickets found**: Check if you have completed/cancelled tickets older than the retention period
2. **No branches/departments**: Verify your organization has branches and departments set up
3. **Archive errors**: Make sure the `tickets_archive` table exists with proper schema
4. **Permission errors**: Ensure the service role key has proper permissions

The function should now work correctly for organization-specific ticket cleanup!
