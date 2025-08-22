# Onboarding System Testing Guide

## Overview

This guide provides comprehensive testing procedures for the enhanced member onboarding system with database persistence and analytics integration.

## Database Schema Changes

### New Columns Added to `members` Table

- `onboarding_completed` (boolean) - Tracks if user completed the onboarding flow
- `onboarding_skipped` (boolean) - Tracks if user skipped the onboarding flow
- `onboarding_completed_at` (timestampz) - Timestamp when onboarding was completed/skipped

## System Components Updated

### 1. Member Interface (`types.ts`)

- Added onboarding fields to Member interface
- Ensures TypeScript compatibility across components

### 2. Invitation API (`api/invite-member/route.ts`)

- Initializes new onboarding fields when creating member invitations
- Sets `onboarding_completed: false`, `onboarding_skipped: false`, `onboarding_completed_at: null`

### 3. Accept Invitation Flow (`accept-invitation/page.tsx`)

- Changed from creating duplicate member to updating existing member
- Activates member by setting `is_active: true` on existing record

### 4. Member Analytics (`MemberAnalytics.tsx`)

- Added onboarding completion statistics
- New analytics card showing onboarding completion rate
- Detailed breakdown of completed/skipped/pending onboarding

## Testing Procedures

### Phase 1: Invitation & Acceptance Testing

#### Test 1: Member Invitation Creation

1. **Admin Action**: Create new member invitation
2. **Expected Database State**:

   ```sql
   SELECT email, is_active, onboarding_completed, onboarding_skipped, onboarding_completed_at
   FROM members WHERE email = 'test@example.com';
   ```

   - `is_active`: false
   - `onboarding_completed`: false
   - `onboarding_skipped`: false
   - `onboarding_completed_at`: null

#### Test 2: Invitation Acceptance

1. **User Action**: Accept invitation via email link
2. **Expected Database State**:

   ```sql
   SELECT email, is_active, onboarding_completed, onboarding_skipped, onboarding_completed_at
   FROM members WHERE email = 'test@example.com';
   ```

   - `is_active`: true
   - `onboarding_completed`: false (unchanged)
   - `onboarding_skipped`: false (unchanged)
   - `onboarding_completed_at`: null (unchanged)

### Phase 2: Onboarding Flow Testing

#### Test 3: Onboarding Completion

1. **User Action**: Complete onboarding flow (all steps)
2. **Expected Database State**:

   ```sql
   SELECT email, is_active, onboarding_completed, onboarding_skipped, onboarding_completed_at
   FROM members WHERE email = 'test@example.com';
   ```

   - `is_active`: true
   - `onboarding_completed`: true
   - `onboarding_skipped`: false
   - `onboarding_completed_at`: [current timestamp]

#### Test 4: Onboarding Skip

1. **User Action**: Skip onboarding flow
2. **Expected Database State**:

   ```sql
   SELECT email, is_active, onboarding_completed, onboarding_skipped, onboarding_completed_at
   FROM members WHERE email = 'test@example.com';
   ```

   - `is_active`: true
   - `onboarding_completed`: false
   - `onboarding_skipped`: true
   - `onboarding_completed_at`: [current timestamp]

### Phase 3: Analytics Testing

#### Test 5: Onboarding Analytics Display

1. **Admin Action**: Navigate to Organization → Member Analytics
2. **Expected UI Elements**:
   - **Onboarding Rate Card**: Shows completion percentage
   - **Onboarding Progress Section**: Shows completed/skipped/pending counts
   - **Analytics Data**: Properly calculates statistics from database

#### Test 6: Analytics Accuracy

1. **Setup**: Create multiple test members with different onboarding states
   - 5 members: completed onboarding
   - 3 members: skipped onboarding
   - 2 members: pending onboarding (neither completed nor skipped)
2. **Expected Analytics**:
   - Total Active: 10
   - Completed: 5
   - Skipped: 3
   - Pending: 2
   - Completion Rate: 80% ((5+3)/10 \* 100)

### Phase 4: Edge Cases & Error Handling

#### Test 7: Database Consistency Check

1. **Validation**: Ensure no members have both `onboarding_completed` and `onboarding_skipped` as true
2. **SQL Query**:

   ```sql
   SELECT COUNT(*) FROM members
   WHERE onboarding_completed = true AND onboarding_skipped = true;
   ```

   - Expected: 0 records

#### Test 8: Inactive Members Exclusion

1. **Setup**: Create inactive member with onboarding data
2. **Expected**: Analytics should exclude inactive members from onboarding statistics
3. **Validation**: Only `is_active = true` members counted in analytics

### Phase 5: Reactivation Testing

#### Test 9: Member Reactivation Preserves Onboarding Data

1. **Setup**: Member with completed onboarding gets deactivated
2. **Action**: Reactivate member
3. **Expected**: Onboarding fields remain unchanged during reactivation
4. **Database Check**: Onboarding data preserved after reactivation

## Automated Testing Commands

### Build Verification

```powershell
cd "d:\ACS\smart-queuing-system\admin"
npm run build
```

### Database Query Examples

```sql
-- Check all onboarding states
SELECT
    email,
    is_active,
    onboarding_completed,
    onboarding_skipped,
    onboarding_completed_at,
    created_at,
    updated_at
FROM members
ORDER BY created_at DESC;

-- Analytics verification query
SELECT
    COUNT(*) as total_active,
    SUM(CASE WHEN onboarding_completed = true THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN onboarding_skipped = true THEN 1 ELSE 0 END) as skipped,
    SUM(CASE WHEN onboarding_completed = false AND onboarding_skipped = false THEN 1 ELSE 0 END) as pending
FROM members
WHERE is_active = true;
```

## Success Criteria

### ✅ Complete Success Indicators

- [ ] All invitation flows create proper database records
- [ ] Accept invitation updates existing records (no duplicates)
- [ ] Onboarding completion updates database correctly
- [ ] Onboarding skip updates database correctly
- [ ] Analytics display accurate onboarding statistics
- [ ] Inactive members excluded from onboarding analytics
- [ ] Member reactivation preserves onboarding data
- [ ] No TypeScript compilation errors
- [ ] Build completes successfully

## Troubleshooting

### Common Issues

1. **Duplicate Members**: Check accept-invitation flow uses UPDATE not INSERT
2. **Analytics Not Updating**: Verify onboarding hooks update database fields
3. **Missing Onboarding Data**: Confirm invitation API initializes new fields
4. **Analytics Showing Wrong Numbers**: Check is_active filter in analytics calculations

### Debug Queries

```sql
-- Find members without onboarding data
SELECT * FROM members
WHERE onboarding_completed IS NULL
   OR onboarding_skipped IS NULL;

-- Check for duplicate members
SELECT email, COUNT(*)
FROM members
GROUP BY email
HAVING COUNT(*) > 1;
```

## Next Steps

After successful testing:

1. Deploy to production environment
2. Monitor onboarding analytics for insights
3. Consider adding onboarding step tracking
4. Implement onboarding completion reminders
