# Smart Queue System MVP - Testing Guide

## Overview

This guide will help you test the MVP features of the Smart Queue System. The system consists of two main applications:

- **Admin Dashboard**: <http://localhost:3001>
- **Customer App**: <http://localhost:3002>

## MVP Features to Test

### 1. Admin Authentication & Setup

#### Test Admin Registration

1. Go to <http://localhost:3001>
2. Click "Sign Up"
3. Create an admin account with organization details
4. Verify you're redirected to the dashboard

#### Test Admin Login

1. Go to <http://localhost:3001/login>
2. Sign in with your admin credentials
3. Verify access to dashboard

### 2. Organization Management

#### Test Organization Settings

1. Navigate to "Organization" tab in admin dashboard
2. Update organization details (name, colors, logo, etc.)
3. Verify changes are saved

#### Test QR Code Generation

1. In Organization tab, go to "QR Codes" section
2. Generate general organization QR code
3. Generate branch-specific QR codes
4. Download and test QR codes

### 3. Branch & Department Management

#### Test Branch Management

1. Go to "Manage" tab in admin dashboard
2. Add new branches with details
3. Edit existing branches
4. Verify branches appear in dropdown selectors

#### Test Department Management

1. In "Manage" tab, add departments to branches
2. Edit department details
3. Verify departments appear when branch is selected

### 4. Queue Management (Admin)

#### Test Queue Operations

1. Go to "Dashboard" tab
2. Select a branch and department
3. Verify queue status displays (waiting count, current serving)
4. Test "Call Next" functionality
5. Test "Reset Queue" functionality
6. Check console for WhatsApp notification logs

### 5. Customer App Testing

#### Test QR Code Access

1. Use generated QR codes to access customer app
2. Verify organization branding loads correctly
3. Verify branch is pre-selected if branch-specific QR code used

#### Test Queue Joining Flow

1. Enter phone number
2. Select branch (if not pre-selected)
3. Select department
4. View queue status
5. Join queue and get ticket number
6. Check console for WhatsApp notification logs

### 6. Member Invitation System

#### Test Member Invitations

1. In Organization tab, go to "Members" section
2. Invite new members with different roles (Manager, Staff)
3. Test invitation acceptance flow
4. Verify role-based access controls

### 7. End-to-End Queue Flow

#### Complete Customer Journey

1. **Customer**: Use QR code to access customer app
2. **Customer**: Complete queue joining process
3. **Admin**: See new customer in queue dashboard
4. **Admin**: Call next customer
5. **Customer**: Receive "your turn" notification (check console)
6. **Admin**: Call next customer again
7. **Customer**: Third person in line receives "almost your turn" notification

## Testing Checklist

### ✅ Admin Dashboard

- [ ] Authentication (Sign up/Sign in/Sign out)
- [ ] Organization settings update
- [ ] QR code generation (general & branch-specific)
- [ ] Branch management (CRUD operations)
- [ ] Department management (CRUD operations)
- [ ] Queue dashboard displays correct data
- [ ] Call next customer functionality
- [ ] Reset queue functionality
- [ ] Member invitation system

### ✅ Customer App

- [ ] QR code access with organization loading
- [ ] Branch pre-selection from QR code
- [ ] Phone number entry
- [ ] Branch selection
- [ ] Department selection
- [ ] Queue status display
- [ ] Ticket booking process
- [ ] Confirmation screen with ticket number

### ✅ Notifications (Console Logs)

- [ ] Ticket creation notification
- [ ] "Your turn" notification
- [ ] "Almost your turn" notification (3rd in line)

### ✅ Data Persistence

- [ ] Organization data persists across sessions
- [ ] Branch/department data persists
- [ ] Queue state persists
- [ ] Ticket numbers increment correctly

## Known Limitations (MVP)

1. **WhatsApp Integration**: Currently logs to console instead of sending actual WhatsApp messages
2. **Real-time Updates**: No live updates between admin and customer apps
3. **Error Handling**: Basic error handling implemented
4. **Mobile Optimization**: Basic responsive design
5. **Analytics**: No detailed analytics dashboard

## Next Steps for Production

1. **Integrate Real WhatsApp API**: Replace console logs with actual WhatsApp service (UltraMsg, Twilio)
2. **Real-time Updates**: Implement WebSocket or Supabase real-time subscriptions
3. **Enhanced Error Handling**: Add comprehensive error states and user feedback
4. **Mobile App**: Consider native mobile app for better customer experience
5. **Analytics Dashboard**: Add detailed queue analytics and reporting
6. **Multi-language Support**: Add localization support
7. **Advanced Queue Features**: Priority queues, appointments, time slots

## Environment Variables Needed

### Admin App (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3001
NEXT_PUBLIC_CUSTOMER_URL=http://localhost:3002
```

### Customer App (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Troubleshooting

### Common Issues

1. **Compilation Errors**: Clear cache with `npm run dev:clean`
2. **Database Errors**: Check Supabase connection and table structure
3. **QR Codes Not Working**: Verify NEXT_PUBLIC_CUSTOMER_URL is set correctly
4. **Authentication Issues**: Check Supabase Auth configuration

### Debug Steps

1. Check browser console for errors
2. Check network tab for failed API calls
3. Verify environment variables are set
4. Check Supabase logs for database errors
5. Restart development servers if needed
