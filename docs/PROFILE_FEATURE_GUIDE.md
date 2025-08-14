# Profile Feature Implementation Guide

## Overview

The Smart Queue Admin system now includes comprehensive profile management functionality with avatar upload capabilities and enhanced user experience.

## Features Implemented

### 1. Profile Dropdown Component

- **Location**: `admin/src/components/ProfileDropdown.tsx`
- **Features**:
  - User avatar display with fallback to initials
  - Dropdown menu with Edit Profile and Sign Out options
  - Smooth animations and responsive design
  - Click-outside detection for menu closing

### 2. Edit Profile Page

- **Location**: `admin/src/app/profile/page.tsx`
- **Features**:
  - Name editing with real-time validation
  - Avatar upload with image preview
  - File type validation (JPG, PNG, GIF, WebP)
  - File size validation (max 5MB)
  - Drag-and-drop or click to upload
  - Toast notifications for success/error feedback

### 3. Enhanced Authentication Context

- **Location**: `admin/src/lib/AuthContext.tsx`
- **Updates**:
  - Added `refreshUser()` function to reload user profile data
  - Support for `avatar_url` field in user profile
  - Maintains existing authentication functionality

## Database Changes

### Members Table Update

Added `avatar_url` column to store profile pictures:

```sql
ALTER TABLE public.members ADD COLUMN avatar_url text;
```

### Storage Bucket Setup

Created secure storage bucket for avatar images:

- **Bucket Name**: `avatars`
- **Public Access**: Yes (for viewing)
- **Upload Policy**: Authenticated users can only upload to their own folder
- **Security**: Path-based access control using `auth.uid()`

## File Structure

```structure
admin/src/
├── components/
│   └── ProfileDropdown.tsx       # Profile card with dropdown menu
├── app/
│   └── profile/
│       └── page.tsx              # Edit profile page
└── lib/
    ├── AuthContext.tsx           # Enhanced with refreshUser
    └── database.types.ts         # Updated with avatar_url field
```

## Integration Points

### Sidebar Integration

The ProfileDropdown component is integrated into the main Sidebar:

- Replaces the standalone Sign Out button
- Maintains responsive design
- Preserves accessibility features

### Storage Integration

Avatar uploads are handled through Supabase Storage:

- Files stored in `avatars/{user_id}/` folders
- Automatic URL generation for avatar display
- Secure deletion of old avatars when uploading new ones

## Usage Instructions

### For Developers

1. **Database Setup**: Run the updated `database-setup.sql` to add avatar support
2. **Storage Setup**: The storage bucket and policies are created automatically
3. **Component Usage**: ProfileDropdown is automatically included in the Sidebar

### For Users

1. **Access Profile**: Click on your profile card in the sidebar
2. **Edit Profile**: Select "Edit Profile" from the dropdown menu
3. **Upload Avatar**: Drag and drop an image or click to browse
4. **Save Changes**: Click "Save Changes" to update your profile

## Technical Implementation Details

### Avatar Upload Process

1. File validation (type, size)
2. Preview generation using FileReader API
3. Upload to Supabase Storage with user-specific path
4. Database update with new avatar URL
5. Context refresh to show new avatar immediately

### Security Considerations

- Path-based access control ensures users can only access their own avatars
- File type validation prevents malicious uploads
- Size limits prevent storage abuse
- Public read access allows avatars to be displayed without authentication

### Error Handling

- Network failures during upload
- Invalid file types or sizes
- Database update failures
- Storage bucket access issues

## Future Enhancements

- Avatar cropping functionality
- Additional profile fields (bio, department display)
- Bulk avatar upload for admin users
- Avatar versioning and history
