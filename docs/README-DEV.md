# Smart Queue System - Development Setup

## Recent Enhancements ✨

### Profile Management System (August 2025)

- **Complete Profile UI/UX** - Comprehensive profile management with celestial design system
- **ProfileDropdown Component** - Elegant profile card with avatar display and dropdown menu  
- **Edit Profile Page** - Full profile editing with name updates and avatar upload
- **Avatar Upload System** - Secure image upload with drag-and-drop, preview, and validation
- **Storage Integration** - Supabase Storage with user-specific folders and access controls
- **Enhanced AuthContext** - Added `refreshUser()` function for real-time profile updates

### UI/UX Design System Overhaul

- **Celestial Color Palette** - Professional dark theme with cosmic accent colors
- **Three-Dots Action Menus** - Consistent Edit/Delete actions throughout the app
- **Portal-Based Modals** - Advanced modal positioning system for perfect viewport alignment  
- **Edit Modals** - Comprehensive forms for editing branches, departments, and profiles
- **Toast Notification System** - App-wide feedback system with success/error states
- **Responsive Components** - Enhanced mobile-first design with smooth animations

### Authentication & Stability Improvements

- **Fixed Chrome redirect loops** - Resolved authentication stuck states
- **Enhanced session recovery** - Automatic reconnection when tabs become inactive
- **Improved middleware** - More robust authentication handling
- **Connection resilience** - Real-time recovery from network issues

### Dashboard Enhancements

- **Complete Queue Manager** - Full branch/department selection with real-time updates
- **Currently Serving Panel** - Live display of active tickets
- **Enhanced real-time subscriptions** - Improved WebSocket connection handling
- **Better error handling** - Connection status indicators and automatic retry

### Technical Fixes

- **React component exports** - Resolved hydration mismatches
- **API query optimization** - Correct status handling ('serving' vs 'called')
- **TypeScript improvements** - Better type safety and error detection

## Quick Start

### Option 1: Using npm script (Recommended)

```bash
npm run dev
```

### Option 2: Using Node.js directly

```bash
node start-dev.js
```

### Option 3: Using batch file (Windows)

```bash
start-dev.bat
```

## What It Does

The development script will:

1. **Check Dependencies** - Automatically install missing node_modules
2. **Start Admin Dashboard** - Runs on `http://localhost:3001`
3. **Start Customer App** - Runs on `http://localhost:3002`
4. **Provide Clear Logging** - Color-coded output for each app
5. **Graceful Shutdown** - Press `Ctrl+C` to stop all processes

## Port Assignments

| Application | Port | URL |
|-------------|------|-----|
| Admin Dashboard | 3001 | <http://localhost:3001> |
| Customer App | 3002 | <http://localhost:3002> |

## Development Commands

```bash
# Start both apps
npm run dev

# Start only admin dashboard
npm run dev:admin

# Start only customer app
npm run dev:customer

# Install all dependencies
npm run install:all

# Build both apps
npm run build

# Clean all caches and node_modules
npm run clean

# Clean only Next.js cache
npm run clean:cache
```

## Troubleshooting

### If apps don't load after restart

1. **Clear browser cache** - `Ctrl + Shift + R`
2. **Clean Next.js cache** - `npm run clean:cache`
3. **Restart development server** - `Ctrl+C` then `npm run dev`

### If ports are already in use

- Check what's running on the ports: `netstat -ano | findstr :3001`
- Kill the process or change ports in package.json files

### If dependencies are missing

```bash
npm run install:all
```

## Development Tips

1. **Keep browser Developer Tools open** (`F12`)
2. **Enable "Disable cache"** in Network tab
3. **Use hard refresh** (`Ctrl+Shift+R`) when needed
4. **Monitor console** for compilation errors
5. **Use Chrome/Firefox** for better development experience than Edge

## Project Structure

```tree
smart-queuing-system/
├── admin/                        # Admin Dashboard (Next.js)
│   ├── src/
│   │   ├── app/
│   │   │   ├── profile/          # Profile management page
│   │   │   ├── dashboard/        # Enhanced dashboard with queue management
│   │   │   ├── manage/           # Tree View management interface
│   │   │   ├── organization/     # QR code generation with department support
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── ProfileDropdown.tsx      # Profile card with avatar & menu
│   │   │   ├── ActionDropdown.tsx       # Three-dots action menus
│   │   │   ├── Portal.tsx               # Modal positioning system
│   │   │   ├── EditBranchModal.tsx      # Branch editing modal
│   │   │   ├── EditDepartmentModal.tsx  # Department editing modal
│   │   │   ├── DashboardLayout.tsx      # Enhanced layout
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── AuthContext.tsx          # Enhanced with refreshUser()
│   │   │   ├── database.types.ts        # Updated with avatar_url
│   │   │   └── ...
│   │   └── hooks/
│   │       └── useAppToast.ts           # Toast notification system
│   ├── package.json                     # Port 3001
│   └── ...
├── customer/                     # Customer App (Next.js)
│   ├── src/
│   ├── package.json             # Port 3002
│   └── ...
├── database-setup.sql           # Updated with avatar storage & policies
├── PROFILE_FEATURE_GUIDE.md     # Profile system documentation
├── start-dev.js                 # Development script
├── start-dev.bat               # Windows batch file
└── package.json                # Root package.json
```

## Key Features Implemented

### 🎨 UI/UX Design System

- **Celestial Color Palette** - Professional dark theme with cosmic accents
- **Three-Dots Action Menus** - Consistent Edit/Delete actions throughout app
- **Portal-Based Modals** - Advanced positioning for perfect viewport alignment
- **Toast Notifications** - App-wide feedback system with success/error states
- **Responsive Design** - Enhanced mobile-first approach with smooth animations

### 👤 Profile Management

- **ProfileDropdown Component** - Elegant profile card with avatar display and menu
- **Edit Profile Page** - Complete profile editing with name and avatar management
- **Avatar Upload System** - Secure image upload with drag-and-drop and validation
- **Storage Integration** - Supabase Storage with user-specific folders and policies
- **Real-time Updates** - Immediate profile changes with `refreshUser()` function

### ⚙️ Enhanced Components

- **ActionDropdown** - Reusable three-dots menu with click-outside detection
- **EditBranchModal** - Comprehensive 4-field branch editing form
- **EditDepartmentModal** - Complete 3-field department editing form
- **Portal System** - SSR-safe modal positioning using React Portals
- **Enhanced AuthContext** - Improved with profile refresh capabilities

### 🔐 Security & Data

- **User-Specific Storage** - Avatar uploads in secure `avatars/{user_id}/` folders
- **Row-Level Security** - Proper access policies for profile data and images
- **File Validation** - Type, size, and format checking for uploaded images
- **Database Migration** - Added `avatar_url` field with proper schema updates

## Next Steps

After starting the development environment:

1. Open `http://localhost:3001` for admin dashboard
2. Open `http://localhost:3002` for customer app
3. Log in with your existing credentials
4. Both apps share the same Supabase database

---

Happy coding! 🚀
