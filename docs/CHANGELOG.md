# Smart Queue System - Changelog

## Version 2.5.0 - Phase 2: Role-Specific Experience & Avatar System (August 22, 2025)

### 🎭 Comprehensive Role-Based Experience Implementation

#### Advanced Role Permission System

- **Three-Tier Role Structure** - Admin, Manager, Employee with granular permission controls
- **Department-Based Auto-Selection** - Employees automatically see only their assigned department services
- **Branch-Specific Manager Controls** - Managers restricted to their assigned branch operations
- **Admin Global Access** - Full system access with organization-wide permissions
- **Dynamic Navigation Filtering** - Role-appropriate menu items and page restrictions

#### Smart Employee Experience

- **Auto-Selection Logic** - Single-department employees automatically select their department
- **Override Capability** - Auto-selection can be overridden when needed for flexibility
- **Streamlined Interface** - Simplified queue controls showing only relevant department services
- **Department Badge Display** - Clean department name display for easy identification

#### Enhanced Member Management Interface

- **Single Department Assignment** - Frontend restriction to one department per user for clarity
- **Role-Specific Dropdowns** - Branch/department assignment only for appropriate roles
- **Admin Protection Logic** - Prevents admin self-removal and inappropriate role assignments
- **Intuitive Dropdown Controls** - Consistent UI patterns matching branch assignment interface

#### Avatar & Personalization System

- **Supabase Storage Integration** - Proper avatar_url field usage from member profiles
- **Role-Based Fallback Avatars** - Beautiful gradient backgrounds with user initials:
  - **Admin**: Purple to indigo gradient
  - **Manager**: Blue to cyan gradient
  - **Employee**: Green to teal gradient
- **Graceful Error Handling** - Automatic fallback when avatar images fail to load
- **Professional Avatar Display** - 32px rounded avatars with border styling

#### Code Quality & Performance

- **PostgreSQL Array Handling** - Proper department_ids parsing between database and frontend
- **Production Code Cleanup** - Removed all debug logging and development artifacts
- **TypeScript Interface Updates** - Enhanced Member type with avatar_url field
- **Streamlined Component Logic** - Simplified dashboard data management and role permissions

### 🛡️ Security & Access Control Improvements

- **Role-Based Page Access** - Proper middleware and permission checks
- **Organization Isolation** - Enhanced tenant isolation with role-appropriate data access
- **Member Assignment Restrictions** - Managers can only assign within their scope
- **Self-Protection Logic** - Users cannot modify their own critical permissions

### 🎨 User Interface Enhancements

- **Consistent Role Colors** - Color-coded elements throughout the interface
- **Professional Member List** - Avatar display with clean typography and spacing
- **Intuitive Controls** - Role-appropriate form controls and restrictions
- **Mobile-Responsive Design** - All new components work seamlessly across devices

### 📊 Dashboard Experience Optimization

- **Employee Auto-Selection** - Automatic department selection for single-department employees
- **Manager Scope Filtering** - Branch-specific queue management for managers
- **Admin Global View** - Complete organization oversight capabilities
- **Real-Time Permission Updates** - Dynamic UI updates based on role changes

---

## Version 2.4.1 - Development Cleanup & Native Invitation System (August 18, 2025)

### 🧹 Major Codebase Cleanup

#### Development Artifacts Removal

- **Removed Obsolete SQL Files** - Deleted custom invitation table files no longer needed with native Supabase
- **Cleaned Alternative Implementations** - Removed unused page alternatives (`page-new.tsx`, `page-new-clean.tsx`)
- **Eliminated Test Files** - Removed development test pages and backup files
- **Simplified Production Code** - Removed all testMode functionality from API routes and components

#### Code Quality Improvements

- **Streamlined API Interface** - Removed unused testMode parameter from InvitationRequest interface
- **Production-Ready Logging** - Removed development console.log statements
- **Clean Member Operations** - Simplified useMemberOperations hook by removing test mode references
- **Single Source of Truth** - Only production `page.tsx` remains for accept-invitation route

### ✅ Native Supabase Invitation System

- **Confirmed Working** - Native Supabase invitation system fully functional
- **No Custom SMTP Required** - Working with Supabase's built-in email service
- **Rate Limit Validated** - 2 invitations per hour sufficient for current needs
- **Clean Implementation** - All custom email service code removed

### 📁 Files Removed

```text
sql/create-invitations-table.sql
sql/create-invitations-table-fixed.sql
admin/src/app/accept-invitation/page-new.tsx
admin/src/app/accept-invitation/page-new-clean.tsx
admin/src/app/test-invite/ (entire directory)
admin/src/app/organization/page-original-backup.tsx
admin/src/app/manage/tree-original-backup.tsx
```

---

## Version 2.4.0 - Advanced Tree Management Features (August 18, 2025)

### 🌳 Enhanced Tree Management Interface

#### Auto Layout & Organization System

- **Auto Arrange Button** - One-click hierarchical layout optimization with bottom-up width calculations
- **Smart Positioning Algorithm** - Automatically positions branches, departments, and services in proper hierarchy
- **Optimal Spacing** - Calculates ideal spacing based on actual node dimensions and content
- **Purple Layout Grid Icon** - Professional UI with clear visual feedback and success notifications

#### Parent-Child Movement System

- **Move Children Toggle** - Orange/gray toggle button to enable/disable children movement with parents
- **Recursive Positioning** - Automatically moves all descendants while maintaining relative positions
- **GitBranch Icon** - Intuitive branching icon that changes color based on active state
- **Hierarchical Integrity** - Preserves organizational structure during drag operations

#### Intelligent Viewport Management

- **Zoom to Fit All** - Smart algorithm to fit all nodes in viewport with optimal zoom and centering
- **Canvas-Aware Calculations** - Accounts for actual canvas dimensions and UI element offsets (320px sidebar)
- **Maximize Icon Button** - Professional maximize icon for instant full organizational overview
- **Transform Origin Fixes** - Added `transform-origin: 0 0` to CSS for consistent positioning

#### Professional Toolbar Redesign

- **Horizontal Layout** - Streamlined top-right toolbar with space-efficient horizontal arrangement
- **Icon-Only Buttons** - Clean, professional design with Lucide React icons
- **Rich Tooltips** - Descriptive tooltips explaining both action and functionality for each button
- **Color-Coded Functions** - Green for save, purple for arrange, orange for toggle operations
- **Enhanced Accessibility** - Comprehensive aria-labels and keyboard navigation support

### 🛠 Technical Implementation

- **Simplified Math** - Replaced complex offset calculations with clean, reliable transform equations
- **Modular Functions** - Clean separation between layout calculation and UI interaction
- **Performance Optimized** - Efficient bounds calculation and viewport detection
- **CSS Transform Fixes** - Proper transform-origin configuration for consistent behavior

### 🎨 User Experience Improvements

- **One-Click Organization** - Auto arrange for instant hierarchy optimization
- **Intelligent Movement** - Toggle between individual and group node movement
- **Complete Overview** - Zoom to fit all for full organizational visibility
- **Professional Design** - Consistent glassmorphism theme with improved icon usage

---

## Version 2.3.0 - Ticket-Based Push Notifications (August 17, 2025)

### 🔔 Major Push Notification System Enhancement

#### Privacy-First Notification Architecture

- **Ticket-ID Based Identification** - Completely migrated from phone-number-based to ticket-ID-based push notifications
- **Optional Phone Numbers** - Customers can now create tickets and receive notifications without providing phone numbers
- **1:1 Ticket Relationship** - Each ticket has its own push subscription for better data integrity
- **Future WhatsApp/SMS Ready** - Phone numbers collected optionally for future multi-channel integration

#### Two-Step Notification Flow

- **Pre-Ticket Initialization** - Push notifications can be enabled before ticket creation
- **Temporary Storage** - Smart localStorage system stores pending subscriptions
- **Automatic Association** - Subscriptions automatically linked to tickets after creation
- **Graceful Cleanup** - Expired pending subscriptions cleaned up automatically

#### Database Schema Overhaul

```sql
-- New ticket-based tables
push_subscriptions: ticket_id (FK) → tickets(id)
notification_preferences: ticket_id (FK) → tickets(id), customer_phone (OPTIONAL)
notification_logs: ticket_id (FK) → tickets(id), multi-channel delivery tracking
```

#### Enhanced API System

- **Updated Push API** - `POST /api/notifications/push` now uses `ticketId` + optional `customerPhone`
- **Subscription Management** - All endpoints updated to handle ticket-based lookups
- **Migration Detection** - Automatic fallback during database migration process
- **Better Error Handling** - Comprehensive error messages and retry logic

#### Customer App Improvements

- **No More Blocking** - Phone number field truly optional, customers can proceed without it
- **Smooth UX** - Push notification setup doesn't require ticket ID upfront
- **Intelligent Flow** - System handles notification setup before ticket creation seamlessly
- **Enhanced Logging** - Detailed logging for troubleshooting notification issues

#### Admin Dashboard Updates

- **Queue Operations** - "Call Next" and "Almost Your Turn" notifications use ticket IDs
- **Notification APIs** - All admin endpoints updated for ticket-based identification
- **Backward Compatibility** - Existing functionality maintained during transition

### 🛠 Technical Achievements

#### Database Migration System

- **Two-Phase Migration** - Safe migration process with backup and rollback capabilities
- **Helper Functions** - `cleanup_expired_push_subscriptions()` and `get_push_subscriptions_by_ticket()`
- **RLS Policies** - Updated Row Level Security for new table structures
- **Index Optimization** - Performance indexes for ticket-based queries

#### Service Architecture

- **PushNotificationService** - New methods: `initializePushNotifications()`, `associateSubscriptionWithTicket()`
- **QueueNotificationHelper** - Updated to use ticket IDs as primary identifier
- **Error Recovery** - Graceful handling of missing subscriptions and network issues

### 🏆 Benefits Delivered

#### Privacy & User Experience

- **Zero Phone Requirement** - Customers can use system without sharing personal information
- **Better Data Relationships** - 1:1 ticket-to-subscription instead of phone-based lookup
- **Cleaner User Flow** - No more "phone number required" blocking ticket creation

#### Technical Improvements

- **Better Architecture** - Ticket-based identification is more logical and maintainable
- **Future-Proof Design** - Ready for WhatsApp/SMS integration when phone numbers provided
- **Enhanced Monitoring** - Comprehensive notification delivery tracking
- **Robust Error Handling** - System works even during migration process

#### Data Integrity

- **Unique Subscriptions** - Each ticket guaranteed its own push subscription
- **Automatic Cleanup** - Expired subscriptions for completed/cancelled tickets
- **Foreign Key Constraints** - Proper database relationships ensure data consistency

### 🧪 Testing & Validation

- **Phone Optional Flow** - ✅ Customers can create tickets without phone numbers
- **Phone Provided Flow** - ✅ Phone numbers stored for future WhatsApp/SMS integration
- **Two-Step Process** - ✅ Notifications work before and after ticket creation
- **Migration Process** - ✅ Database migration tested and validated
- **Error Scenarios** - ✅ Graceful handling of edge cases and failures

### 📁 Files Modified

- Database: `sql/database-push-notifications-ticket-based.sql`, `sql/database-push-notifications-final-swap.sql`
- Customer: `customer/src/app/page.tsx`, `customer/src/lib/pushNotifications.ts`, `customer/src/lib/queueNotifications.ts`
- Admin: `admin/src/app/api/notifications/*`, `admin/src/app/dashboard/features/queue-controls/useQueueOperations.ts`

---

## Version 2.2.0 - SaaS Subscription Plan System (August 16, 2025)

### 🏢 Multi-Tenant Subscription Architecture

#### Complete Plan Limit Enforcement System

- **Four Subscription Tiers** - Starter (1/3/10/5), Growth (3/10/30/20), Business (10/50/200/100), Enterprise (unlimited)
- **Multi-Resource Limits** - Branches, departments, services, staff members, and monthly tickets
- **Database-Level Enforcement** - PostgreSQL RLS policies prevent limit circumvention
- **Real-Time Monitoring** - Live usage tracking and percentage calculations

#### Frontend Implementation

- **usePlanLimits Hook** - React hook for plan limit checking and usage monitoring
- **Button Disabling System** - All creation buttons disabled when limits reached
- **Native Tooltips** - Hover messages showing upgrade requirements (reverted from custom tooltips)
- **Toast Notifications** - Click disabled buttons to see upgrade prompts with action buttons
- **Progress Bar Dashboard** - Visual usage indicators with color-coding (green/yellow/red)

#### Database Architecture

- **organization_plan_info View** - Comprehensive plan and usage data aggregation
- **Helper Functions** - `check_branch_limit()`, `check_department_limit()`, `check_service_limit()`, `check_staff_limit()`
- **RLS Policy Integration** - All tables (branches, departments, services, members) enforce limits
- **Usage Tracking Functions** - `get_organization_usage()` for real-time analytics

#### UI/UX Enhancements

- **Plan Dashboard Component** - Visual overview of current plan usage with progress bars
- **Multi-Point Enforcement** - TreeControls, TreeCanvas, and NodePanel all respect limits
- **Upgrade Suggestions** - Automatic prompts when usage exceeds 50%
- **Visual Indicators** - Lock icons and disabled states for over-limit actions

### 🐛 Bug Fixes

- **Fixed Progress Bar Display** - Corrected parameter mapping in PlanLimitsDashboard (branches→branch, departments→department, services→service)
- **Resolved Custom Tooltip Issues** - Reverted to native browser tooltips for better positioning and reliability
- **Clean Build Process** - Removed orphaned imports and ensured both admin and customer apps build successfully

### 🔧 Technical Improvements

- **Production Ready Build** - Both applications compile with zero errors (Admin: 16 routes, Customer: 6 routes)
- **Type Safety** - Full TypeScript integration with proper type checking for all plan-related functions
- **Documentation Updates** - Comprehensive SaaS subscription system guide with implementation details

### 📊 Analytics & Monitoring

- **Usage Tracking Queries** - SQL queries to identify upgrade candidates and monitor plan utilization
- **Real-Time Dashboard** - Live updates of organization limits and current usage
- **Upgrade Analytics** - Built-in detection of organizations approaching plan limits

## Version 2.1.0 - Animated Push Notification Popups (August 15, 2025)

### 🎬 In-App Animated Notification System

#### PushNotificationPopup Component

- **Animated Popups** - Beautiful in-app notifications with different animations per notification type
- **Three Animation Types**:
  - **Slide Down** - Gentle entrance for ticket creation notifications (blue theme)
  - **Bounce In** - Attention-grabbing for "almost your turn" alerts (orange theme)
  - **Pulse Glow** - Urgent pulsing animation for "your turn" notifications (green theme)
- **Auto-dismiss** - 5-second countdown with animated progress bar
- **Manual Close** - X button for immediate dismissal
- **Responsive Design** - Mobile-optimized with top-right positioning

#### Service Worker Integration

- **Enhanced Service Worker** - Modified to send messages to app when push notifications arrive
- **Dual Notification System** - System notifications + beautiful in-app popups
- **Message Passing** - Seamless communication between service worker and main app

#### Smart Notification Triggers

- **Ticket Creation** - Immediate popup when customer joins queue
- **Queue Position Updates** - Notifications when customer moves to top 3 positions
- **Service Ready Alerts** - Urgent notification when it's customer's turn
- **30-Second Polling** - Background monitoring of ticket status for real-time updates

#### Technical Implementation

- **Custom SVG Icons** - Lightweight icons without external dependencies
- **CSS Animations** - Hardware-accelerated animations for smooth performance
- **State Management** - Clean React state handling for notification display
- **Accessibility** - Proper ARIA labels and keyboard navigation support

## Version 2.0.0 - Profile Management & UI/UX Overhaul (August 2025)

### 🎨 Complete UI/UX Design System Overhaul

#### Celestial Design System

- **Celestial Color Palette** - Implemented professional dark theme with cosmic accent colors
- **Consistent Component Styling** - Updated all components with new design language
- **Enhanced Sidebar Design** - Improved layout with ProfileDropdown integration
- **Dashboard Enhancements** - Refined dashboard layout with better spacing and typography
- **Organization Page Updates** - Improved form styling and layout consistency
- **Manage Page Redesign** - Enhanced tables with action menus and better organization

#### Three-Dots Action Menu System

- **ActionDropdown Component** - Created reusable three-dots menu for Edit/Delete actions
- **Branch Management** - Added edit/delete actions for branches with comprehensive 4-field editing
- **Department Management** - Added edit/delete actions for departments with 3-field editing
- **Consistent UX** - Standardized action patterns across all management interfaces
- **Click-Outside Detection** - Proper menu closing behavior with event handling

### 👤 Comprehensive Profile Management System

#### ProfileDropdown Component

- **Avatar Display** - User avatar with fallback to styled initials
- **Dropdown Menu** - Clean menu with Edit Profile and Sign Out options
- **Smooth Animations** - Professional transitions and hover effects
- **Responsive Design** - Works perfectly on all screen sizes
- **Accessibility** - Proper ARIA labels and keyboard navigation

#### Edit Profile Page

- **Name Editing** - Real-time validation and update functionality
- **Avatar Upload System** - Drag-and-drop or click to upload with preview
- **File Validation** - Type checking (JPG, PNG, GIF, WebP) and size limits (5MB)
- **Image Preview** - Real-time preview before saving changes
- **Toast Notifications** - Success/error feedback for all operations
- **Responsive Layout** - Mobile-optimized form design

#### Storage & Security Integration

- **Supabase Storage** - Secure avatar storage with user-specific folders
- **Access Policies** - Row-level security for upload/update/delete operations
- **File Cleanup** - Automatic deletion of old avatars when uploading new ones
- **Public Access** - Secure public read access for avatar display
- **Path Structure** - Organized `avatars/{user_id}/` folder structure

### 🏗️ Advanced Component Architecture

#### Portal-Based Modal System

- **Portal Component** - SSR-safe modal positioning using React Portals
- **Viewport Alignment** - Perfect modal positioning regardless of scroll position
- **EditBranchModal** - Comprehensive branch editing with 4 fields (name, address, phone, status)
- **EditDepartmentModal** - Complete department editing with 3 fields (name, prefix, status)
- **Transform Positioning** - CSS transform-based centering for consistent placement

#### Enhanced Authentication Context

- **refreshUser() Function** - Real-time profile data refresh capability
- **Avatar URL Support** - Added avatar_url field to user profile interface
- **Backward Compatibility** - Maintains all existing authentication functionality
- **Type Safety** - Full TypeScript integration with proper interface definitions

#### Toast Notification System

- **App-Wide Integration** - Consistent notification patterns throughout the application
- **Success/Error States** - Professional feedback for all user operations
- **Smooth Animations** - Elegant entrance and exit transitions
- **Custom Hook** - useAppToast hook for easy integration in components

### 🗄️ Database & Schema Updates

#### Members Table Enhancement

- **avatar_url Column** - Added nullable text field for profile pictures
- **Migration Script** - Safe addition with existence checking
- **Type Definitions** - Updated TypeScript interfaces to include avatar_url

#### Storage Bucket Configuration

- **Avatars Bucket** - Created secure storage bucket for profile images
- **User-Specific Policies** - Upload/update/delete permissions per user folder
- **Public Read Access** - Secure viewing of avatars without authentication
- **Automated Cleanup** - Policies for managing old avatar files

### 🔧 Technical Improvements 101

#### Development Experience

- **Component Modularity** - Clear separation of concerns and reusability
- **Error Handling** - Comprehensive error boundaries and user feedback
- **Performance Optimization** - Efficient re-rendering with proper dependency management
- **Code Organization** - Well-structured component hierarchy and file organization

#### Accessibility & UX

- **ARIA Labels** - Proper accessibility attributes throughout
- **Keyboard Navigation** - Full keyboard support for all interactive elements
- **Focus Management** - Proper focus handling in modals and dropdowns
- **Mobile Optimization** - Touch-friendly interactions and responsive design

### 📦 Files Added/Modified

#### New Components

- `admin/src/components/ProfileDropdown.tsx` - Profile card with avatar and dropdown menu
- `admin/src/components/ActionDropdown.tsx` - Reusable three-dots action menu
- `admin/src/components/Portal.tsx` - Modal positioning system using React Portals
- `admin/src/components/EditBranchModal.tsx` - Branch editing modal with validation
- `admin/src/components/EditDepartmentModal.tsx` - Department editing modal with validation

#### New Pages

- `admin/src/app/profile/page.tsx` - Complete profile editing page with avatar upload

#### Enhanced Files

- `admin/src/lib/AuthContext.tsx` - Added refreshUser() function and avatar_url support
- `admin/src/lib/database.types.ts` - Updated with avatar_url field in members table
- `admin/src/components/Sidebar.tsx` - Integrated ProfileDropdown component
- `admin/src/app/manage/page.tsx` - Added three-dots action menus with edit modals
- `database-setup.sql` - Added avatar_url column and storage bucket configuration

#### Documentation

- `PROFILE_FEATURE_GUIDE.md` - Comprehensive profile feature documentation
- Updated `README-DEV.md` - Enhanced with new features and project structure
- Updated `DEVELOPMENT_STATUS.md` - Added recent enhancements and technical details

### 🚀 Migration Guide

#### Database Updates Required

1. Run the updated `database-setup.sql` in Supabase SQL Editor
2. Verify `avatar_url` column added to members table
3. Confirm storage bucket and policies are created

#### No Breaking Changes

- All existing functionality remains intact
- Profile features are additive enhancements
- Backward compatible with existing user data

---

## Version 1.1.0 - Enhanced Stability Release (December 2024)

### 🚀 Major Enhancements

#### Authentication & Session Management

- **Fixed Chrome redirect loops** - Resolved authentication stuck states during login flows
- **Enhanced session recovery** - Automatic reconnection when browser tabs become inactive
- **Improved middleware handling** - More robust authentication routing without conflicts
- **Connection resilience** - Real-time recovery from network interruptions and page visibility changes
- **Mount state tracking** - Proper client-side hydration handling to prevent SSR mismatches

#### Dashboard Functionality Restoration

- **Complete Queue Manager** - Restored full branch/department selection with real-time data updates
- **Currently Serving Panel** - Enhanced live display of active tickets with department information
- **Enhanced real-time subscriptions** - Improved WebSocket connection handling with automatic retry logic
- **Better error handling** - Added connection status indicators and user-friendly error recovery
- **Loading state management** - Professional loading indicators during data fetching operations

#### Technical Stability Improvements

- **React component exports** - Resolved "default export is not a React Component" errors
- **API query optimization** - Corrected status handling ('serving' vs 'called') throughout the system
- **TypeScript enhancements** - Better type safety and error detection for queue operations
- **Hydration mismatch resolution** - Added suppressHydrationWarning for client-server consistency
- **Memory leak prevention** - Proper cleanup of event listeners and subscriptions

### 🔧 Technical Fixes

#### AuthContext Enhancements

- Added visibility change handlers for automatic reconnection
- Improved session persistence across page refreshes
- Better error handling for authentication failures
- Enhanced loading states for better UX

#### Middleware Improvements

- Less aggressive redirect handling to prevent loops
- Better parameter handling for authentication flows
- Enhanced error logging and debugging support

#### Dashboard Component

- Fixed function declaration and export syntax
- Proper real-time subscription management
- Enhanced connection error recovery
- Improved queue data fetching with retry logic

#### API & Database Integration

- Corrected ticket status transitions (waiting → serving → completed)
- Fixed queue settings synchronization
- Improved error handling for database operations
- Better handling of concurrent queue operations

### 📝 Documentation Updates

- Updated README-DEV.md with recent enhancements
- Enhanced DEVELOPMENT_STATUS.md with latest improvements
- Updated MVP_COMPLETION_SUMMARY.md with stability fixes
- Added comprehensive troubleshooting guide in DEVELOPMENT_GUIDE.md

### 🐛 Bug Fixes 101

- Fixed browser tab inactive connection loss
- Resolved authentication redirect infinite loops
- Fixed real-time subscription cleanup issues
- Corrected hydration mismatches in dashboard components
- Fixed API status field inconsistencies

### 🎯 Performance Improvements

- Optimized real-time subscription handling
- Better memory management for event listeners
- Improved loading states and error boundaries
- Enhanced connection recovery mechanisms

---

## Version 1.0.0 - MVP Release (Initial)

### 🎉 Initial MVP Features

#### Core Platform

- Complete multi-tenant SaaS architecture
- Admin dashboard with organization management
- Customer mobile application with QR code access
- Real-time queue management system

#### Authentication & Security

- Supabase Auth integration
- Role-based access control (Admin/Manager/Staff)
- Secure session management
- Row-level security policies

#### Queue Management

- Alphanumeric ticket generation (BA001, AR002, etc.)
- Real-time queue status updates
- Multi-department support
- Call next customer functionality

#### Customer Experience

- QR code scanning for instant access
- Dynamic organization branding
- Real-time queue position updates
- WhatsApp notification integration

#### Technical Infrastructure

- Next.js 14.2.5 with TypeScript
- Supabase backend with PostgreSQL
- Tailwind CSS responsive design
- Real-time subscriptions for live updates

---

## Future Roadmap

### Version 1.2.0 (Planned)

- SMS/WhatsApp API integration for live notifications
- Advanced analytics and reporting
- Mobile app for staff queue management
- Multi-language support

### Version 1.3.0 (Planned)

- Appointment scheduling integration
- Customer feedback system
- Advanced queue optimization algorithms
- API for third-party integrations
