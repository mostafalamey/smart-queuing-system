# 🎯 Smart Queue Management System

> **Enterprise-Grade SaaS Queue Management Solution**  
> Complete admin dashboard and customer application with real-time updates and production deployment

[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![Production](https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=for-the-badge)](https://github.com/mostafalamey/smart-queuing-system)

## 🚀 **Live Production Applications**

- **Admin Dashboard**: [Deployed on Vercel](https://smart-queue-admin.vercel.app)
- **Customer App**: [Deployed on Vercel](https://smart-queue-customer.vercel.app)

> ✨ **Fully deployed and operational with enterprise-grade authentication system**

---

## 📋 **Features**

### 🔐 **Admin Dashboard**

- **Enterprise Authentication** - Bulletproof session management with tab switching support
- **Complete Analytics Dashboard** - Professional data visualization with custom chart library ✨
  - **Real-Time Queue Analytics** - Live queue statistics, ticket processing metrics, performance insights
  - **Custom Chart Components** - Zero-dependency SVG-based charts (Line, Bar, Doughnut, Pie)
  - **Department Performance Tracking** - Individual department analytics with service-level insights
  - **Interactive Data Visualization** - Responsive charts with hover states and professional tooltips
  - **Historical Trend Analysis** - Time-based filtering with comprehensive data visualization
  - **Mobile-Optimized Charts** - Responsive design scaling across all device sizes
- **Enhanced UI/UX Design System** - Consistent professional styling across entire application ✨
  - **Analytics-Card Shadow System** - Professional depth with enhanced contrast (`0 4px 20px rgba(0,0,0,0.08)`)
  - **Global Style Consistency** - Unified shadow system and visual design language
  - **Dark Background Implementation** - Professional darker backgrounds for better visual hierarchy
  - **Refined Animation System** - Enterprise-grade interactions with removed excessive translate-y effects
- **Real-Time Member Management** - Enterprise-grade real-time member operations with instant updates ✨
  - **Automatic Security Enforcement** - Deactivated members signed out instantly (2-second warning)
  - **Live Table Updates** - All member tables update in real-time without page refresh
  - **Multi-Tab Synchronization** - Changes sync immediately across all open browser tabs
  - **Comprehensive Member Deletion** - Complete cleanup including auth records and avatar files
  - **Professional Toast Confirmations** - Elegant toast notifications replace browser alerts
  - **Assignment Preservation** - Branch/department assignments preserved during deactivation
  - **Enhanced Invitation System** - Mandatory branch/department pre-assignment during invites
  - **Real-Time Analytics** - Live member statistics with onboarding completion tracking
- **Beautiful Loading Overlays** - Professional auth feedback with animated progress indicators
- **Organization Management** - Multi-tenant architecture with custom branding
- **Service-Level Queuing** - Hierarchical organization → branch → department → service structure
- **Interactive Tree Management** - Advanced visual tree interface with:
  - **Drag & Drop Interface** - Real-time node repositioning with visual feedback
  - **Zoom & Pan Canvas** - Mouse wheel zoom (0.3x-3x) with smooth pan navigation
  - **Auto Arrange System** - One-click hierarchical layout optimization with smart positioning ✨
  - **Move Children Toggle** - Parent-child movement system maintaining relative positions ✨
  - **Zoom to Fit All** - Intelligent viewport management to show entire organization ✨
  - **Professional Toolbar** - Horizontal icon-based controls with rich tooltips ✨
  - **Persistent Layouts** - Auto-save node positions and viewport settings per organization
  - **Smart Click Detection** - Distinguishes between clicks and drags for optimal UX
  - **Minimizable Details Panel** - Collapsible node information to reduce visual clutter
  - **Glassmorphism Design** - Professional semi-transparent UI with backdrop blur effects
  - **SVG Connections** - Smooth curved lines connecting parent and child nodes
  - **Modular Architecture** - Feature-based components for maintainable code
- **Enhanced QR Code System** - General, branch-specific, and department-specific QR codes
- **Advanced Queue Management** - Enhanced workflow with skip/complete functionality
  - **Smart Reset Options** - Professional modal interface with clear choice between simple reset or cleanup
  - **Complete Ticket Workflow** - Skip, complete, or call next customer
  - **Database State Tracking** - Proper status management (waiting, serving, completed, cancelled)
  - **Modal Confirmations** - Professional confirmation modals for destructive actions (delete, reset)
- **Role-Specific Experience System** - **Phase 2: Comprehensive Role-Based Interface** ✨
  - **Three-Tier Role Architecture** - Admin, Manager, Employee with tailored experiences
  - **Admin Global Management** - Complete organization oversight with member management
  - **Manager Branch Control** - Branch-specific access with employee assignment capabilities
  - **Employee Auto-Selection** - Intelligent department selection and streamlined interface
  - **Avatar Integration** - Supabase Storage avatars with role-based gradient fallbacks
  - **Single Department Assignment** - Clean UI restricting employees to one department
  - **Professional Member Interface** - Avatar display with role-specific color schemes
  - **Granular Permissions** - Fine-tuned access controls for each role level
  - **Self-Protection Logic** - Users cannot modify their own critical permissions
  - **Production Code Quality** - Debug-free, optimized implementation
- **Real-time Queue Monitoring** - Live updates with WebSocket subscriptions
- **Enhanced Message Template System** - **Complete Customizable Notification Management** ✨:
  - **Admin Template Editor** - Organization → Messages tab with live preview system
  - **Rich Message Content** - Organization branding, bold ticket numbers, queue statistics
  - **Variable Substitution** - Dynamic content using `{{organizationName}}`, `{{ticketNumber}}`, etc.
  - **Dual Channel Templates** - Separate customization for WhatsApp (markdown) and Push notifications
  - **Three Message Types** - "Ticket Created", "You Are Next", "Your Turn" templates
  - **Role-Based Access** - Admin/Manager can edit, Employee can view templates
  - **Real-Time Queue Data** - Templates include position, wait times, currently serving info
  - **Database Integration** - Custom templates stored with organization-level security
- **WhatsApp Inbound-First Integration** - **Complete Business Compliance System** ✨:
  - **Policy Compliance** - WhatsApp Business API compliant to prevent account bans
  - **Inbound-First Architecture** - Customers must message first (24-hour windows)
  - **UltraMessage Webhook** - Complete webhook processing at `/api/webhooks/ultramsg/inbound`
  - **Session Management** - Automatic 24-hour communication window creation
  - **Phone-Based Sessions** - Persistent sessions linked to customer phone numbers
  - **Database Schema** - Complete `whatsapp_sessions` and inbound message tracking
  - **Customer Session API** - `/api/whatsapp/create-session` with GET/POST support
  - **Legacy Compatibility** - Backwards compatible with existing ticket systems
- **Push Notification Management** - **Revolutionary Phone-Based Notification System** ✨:
  - **Phone-Based Subscriptions** - Complete redesign for persistent cross-session notifications
  - **App Restart Persistence** - Push notifications survive app restarts and browser sessions
  - **Mandatory Phone Collection** - Required phone numbers ensure reliable notification delivery
  - **Zero Subscription Pollution** - Eliminated duplicate database entries with smart deduplication
  - **UltraMessage WhatsApp Integration** - Professional WhatsApp fallback when push fails
  - **Dual Lookup System** - Backwards-compatible support for legacy ticket-based subscriptions
  - **Automatic "Your Turn" notifications** when calling next customer
  - **"Almost Your Turn" alerts** for upcoming customers (1-2 positions ahead)
  - **Organization logo integration** for branded notifications
  - **Bulletproof Queue Operations** - Eliminated 409 conflicts and database errors
  - **Professional notification formatting** with rich content and vibration patterns
  - **Real-Time WhatsApp Fallback** - Instant WhatsApp messaging via UltraMessage API
  - **Production Monitoring** - Comprehensive logging and error handling
- **Enhanced QR Code System** - Three-tier QR code generation:
  - **General QR Codes** - Links to organization with full selection flow
  - **Branch-Specific QR Codes** - Pre-selects branch for faster access
  - **Department-Specific QR Codes** - Direct access to department with service selection
- **User Invitation System** - Email-based team invitations with role management
- **Profile Management** - Avatar upload, user settings, and profile editing with secure sign-out confirmation
- **Professional UI** - Celestial dark theme with responsive design
- **Advanced Modal System** - Confirmation modals for critical actions with toast notifications for feedback

### 📱 **Customer Application**

- **Revolutionary Phone-Based Experience** - Persistent notifications across app sessions ✨
- **Mandatory Phone Collection** - Required phone numbers ensure reliable notification delivery
- **Service-Level Selection** - Customers choose specific services within departments
- **Department Pre-selection** - QR codes can pre-select departments for faster flow
- **Organization Branding** - Custom themes based on organization settings
- **Real-time Updates** - Live queue status and position notifications
- **Advanced Phone-Based Notification System** ✨:
  - **App Restart Persistence** - Notifications survive app restarts and browser sessions
  - **Phone-Based Subscriptions** - Complete redesign from ticket-based to phone-based system
  - **WhatsApp Session Integration** - Automatic WhatsApp session creation for inbound-first compliance
  - **24-Hour Communication Windows** - WhatsApp Business API compliant messaging periods
  - **Enhanced Message Templates** - Rich notifications with organization branding and queue statistics
  - **Custom Template Loading** - Automatically uses organization's customized message templates
  - **Queue Analytics Integration** - Messages include real-time position, wait times, currently serving
  - **UltraMessage Integration** - Professional WhatsApp messaging with webhook processing
  - **Zero Subscription Pollution** - Smart deduplication prevents database flooding
  - **Instant ticket creation confirmations** with personalized content
  - **"Your Turn" alerts** when customer is being served via push + WhatsApp
  - **"Almost Your Turn" advance warnings** for upcoming positions
  - **Organization logo branding** integrated into all notifications
  - **Cross-session reliability** - Notifications work even after closing/reopening app
  - **Professional message templates** with emojis and branded formatting
  - **Automatic fallback system** - WhatsApp when push notifications fail
  - **International phone support** - Global phone number validation and formatting
- **Clean Console Experience** - Production-ready logging with debug mode control
- **Multi-language Ready** - Extensible localization framework
- **Offline Capabilities** - Progressive Web App features

### 🛠️ **Enterprise Technical Features**

- **Production Authentication** - Enterprise-grade session management with:
  - Automatic session recovery on tab switching
  - Browser cache clearing detection and graceful fallback
  - Network interruption resilience with retry mechanisms
  - Professional loading overlays during auth processes
- **TypeScript** - 100% type safety across entire application
- **Server-Side Rendering** - Next.js 14 App Router with optimized builds
- **Real-time Architecture** - Supabase WebSocket integration with failover
- **Push Notification System** - Enterprise-grade browser notifications with VAPID authentication
- **Production Optimization** - Clean code deployment with all debug logging removed
- **Security Headers** - Production-ready security configuration
- **Monorepo Structure** - Scalable architecture with separate deployments
- **Error Boundaries** - Comprehensive error handling and recovery

---

## 🏗️ **Tech Stack**

| Category          | Technology                             |
| ----------------- | -------------------------------------- |
| **Frontend**      | Next.js 14.2.5, React 18, TypeScript   |
| **Styling**       | Tailwind CSS, Lucide React Icons       |
| **Backend**       | Supabase (PostgreSQL, Auth, Real-time) |
| **Notifications** | Web Push API, VAPID, Service Workers   |
| **Messaging**     | UltraMessage WhatsApp Business API     |
| **Deployment**    | Vercel (Production Ready)              |
| **Development**   | Hot Reload, TypeScript, ESLint         |

---

## 📦 **Deployment**

### ✅ Production Deployment (Live)

**Both applications are successfully deployed and operational:**

- **Admin Dashboard**: [https://smart-queue-admin.vercel.app](https://smart-queue-admin.vercel.app)
- **Customer App**: [https://smart-queue-customer.vercel.app](https://smart-queue-customer.vercel.app)

**Key Production Features:**

- ✅ Enterprise-grade authentication with session persistence
- ✅ Professional loading overlays and error handling
- ✅ Real-time subscriptions with automatic reconnection
- ✅ Security headers and CORS protection
- ✅ Optimized builds with fast loading times
- ✅ Mobile-responsive design across all devices

### 🚀 Deploy Your Own Instance

This project is **production-ready** with complete Vercel configuration included.

1. **Fork the repository** to your GitHub account

1. **Create two Vercel projects:**

   - **Admin Dashboard**: Root directory `admin`
   - **Customer Application**: Root directory `customer`

1. **Configure environment variables** for both projects:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ADMIN_URL` (for customer app)
   - `NEXT_PUBLIC_CUSTOMER_URL` (for admin dashboard)

1. **Set up your Supabase project** using `DATABASE_SETUP.md`

1. **Deploy** - Vercel will automatically build and deploy both applications

**Detailed instructions**: [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)

---

## 📁 **Project Structure**

```text
smart-queuing-system/
├── admin/                  # Admin Dashboard (Next.js)
│   ├── src/app/           # App Router pages
│   ├── src/components/    # Reusable components
│   ├── src/lib/          # Utilities and configurations
│   └── package.json      # Admin dependencies
├── customer/              # Customer App (Next.js)
│   ├── src/app/          # Customer pages
│   ├── src/components/   # Customer components
│   └── package.json      # Customer dependencies
├── vercel.json           # Deployment configuration
├── package.json          # Root workspace configuration
└── docs/                 # Comprehensive documentation
```

---

## 🧪 **Development**

### Available Scripts

```bash
# Development
npm run dev              # Start both applications
npm run dev:admin        # Start only admin dashboard
npm run dev:customer     # Start only customer app

# Production
npm run build            # Build both applications
npm run build:admin      # Build admin dashboard
npm run build:customer   # Build customer app

# Maintenance
npm run clean            # Clean all build files
npm run install:all      # Install all dependencies
```

### Development Tools

- **Hot Reload** - Instant development feedback
- **TypeScript** - Full type checking
- **ESLint** - Code quality enforcement
- **Tailwind CSS** - Utility-first styling

---

## 📚 **Documentation**

| Document                                                           | Description                                   |
| ------------------------------------------------------------------ | --------------------------------------------- |
| [SERVICE_LEVEL_QUEUING_GUIDE.md](./SERVICE_LEVEL_QUEUING_GUIDE.md) | Service-level queuing and Tree View interface |
| [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)                     | Complete development setup                    |
| [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)         | Production deployment                         |
| [DATABASE_SETUP.md](./DATABASE_SETUP.md)                           | Database schema and setup                     |
| [MVP_TESTING_GUIDE.md](./MVP_TESTING_GUIDE.md)                     | Testing procedures                            |
| [PROFILE_FEATURE_GUIDE.md](./PROFILE_FEATURE_GUIDE.md)             | Profile system documentation                  |

---

## 🎯 **Production Status**

✅ **DEPLOYED & OPERATIONAL**

- [x] **Enterprise Authentication System** - Bulletproof session management with tab switching support
- [x] **Professional Loading Overlays** - Beautiful auth feedback with progress indicators
- [x] **Service-Level Queuing System** - Complete hierarchical queue management
- [x] **Tree View Management Interface** - Visual organizational structure management
- [x] **Enhanced QR Code System** - General, branch-specific, and department-specific codes
- [x] **Real-time queue updates** - Live WebSocket subscriptions with failover
- [x] **Mobile-responsive customer app** - Progressive Web App capabilities
- [x] **Profile management system** - Avatar upload and comprehensive user settings
- [x] **Advanced toast notification system** - App-wide feedback with animations
- [x] **Production deployment** - Fully deployed on Vercel with custom domains
- [x] **Security hardening** - Enterprise-grade security headers and authentication
- [x] **Error boundary system** - Comprehensive error handling and recovery

🚀 **RECENT ENHANCEMENTS (August 2025)**

**Latest: Analytics System Restoration (August 31, 2025)** ✨

- [x] **GitHub Action Authentication Fix** - Resolved HTTP 401 failures in automated cleanup
- [x] **Enhanced Analytics Data Restoration** - Fixed schema mismatch causing 0/N/A display
- [x] **Chart Rendering NaN Elimination** - Comprehensive SVG coordinate safety implementation
- [x] **Console Error Resolution** - Clean development experience with zero query errors
- [x] **Comprehensive Null Safety** - Analytics system hardened against invalid data states

**Previous Enhancements:**

- [x] **Service-Level Queuing Implementation** - Complete service selection within departments
- [x] **Department-Specific QR Codes** - Direct access QR codes for streamlined customer flow
- [x] **Tree View Management** - Visual interface replacing form-based organization management
- [x] **Authentication Resilience** - Tab switching, cache clearing, and network interruption recovery
- [x] **Loading UX Overhaul** - Professional modal overlays with animated feedback
- [x] **Session Management** - Enterprise-grade authentication with automatic recovery
- [x] **Production Optimization** - Fast loading with intelligent fallback mechanisms
- [x] **Error Handling** - Robust error boundaries with graceful degradation

� **UPCOMING FEATURES**

- [ ] WhatsApp notifications integration
- [ ] Advanced analytics dashboard with charts
- [ ] Multi-language support system
- [ ] Native mobile app (React Native)
- [ ] Advanced queue analytics and reporting

---

## 🔒 **Enterprise Security**

### Authentication & Session Management

- **Enterprise Session Management** - Bulletproof authentication with automatic recovery
- **Tab Switching Resilience** - Maintains authentication state across browser tabs
- **Cache Clearing Detection** - Graceful fallback when browser cache is cleared
- **Network Interruption Recovery** - Automatic reconnection with retry mechanisms
- **Professional Loading States** - User-friendly feedback during authentication processes

### Security Infrastructure

- **Environment Variables** - Secure configuration management with production-ready setup
- **Supabase Authentication** - Industry-standard OAuth with JWT tokens and refresh handling
- **CORS Protection** - Configured for production domains with secure cross-origin policies
- **SQL Injection Prevention** - Parameterized queries via Supabase with Row Level Security
- **XSS Protection** - Security headers and content validation across all applications
- **Production Headers** - Comprehensive security headers including CSP and HSTS

### Data Protection

- **Row Level Security** - Database-level access control with user-specific data isolation
- **Real-time Security** - Secure WebSocket connections with authenticated subscriptions
- **File Upload Security** - Secure avatar upload with validation and access policies
- **Session Encryption** - End-to-end encrypted session management with secure storage

---

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 **Support**

- **Email**: [mlamey@outlook.com](mailto:mlamey@outlook.com)
- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Create an issue for bug reports or feature requests

---

**Built with ❤️ by [Mostafa Lamey](https://github.com/mostafalamey)**

> Transform your business operations with intelligent queue management
