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
- **Beautiful Loading Overlays** - Professional auth feedback with animated progress indicators  
- **Organization Management** - Multi-tenant architecture with custom branding
- **Branch & Department Management** - Hierarchical structure with full CRUD operations
- **Advanced Queue Management** - Enhanced workflow with skip/complete functionality
  - **Smart Reset Options** - Professional modal interface with clear choice between simple reset or cleanup
  - **Complete Ticket Workflow** - Skip, complete, or call next customer
  - **Database State Tracking** - Proper status management (waiting, serving, completed, cancelled)
  - **Modal Confirmations** - Professional confirmation modals for destructive actions (delete, reset)
- **Real-time Queue Monitoring** - Live updates with WebSocket subscriptions
- **QR Code Generation** - Dynamic customer app links with organization theming
- **User Invitation System** - Email-based team invitations with role management
- **Profile Management** - Avatar upload, user settings, and profile editing with secure sign-out confirmation
- **Professional UI** - Celestial dark theme with responsive design
- **Advanced Modal System** - Confirmation modals for critical actions with toast notifications for feedback

### 📱 **Customer Application**

- **Mobile-First Design** - Optimized for smartphones with dynamic theming
- **Organization Branding** - Custom themes based on organization settings
- **Real-time Updates** - Live queue status and position notifications
- **Phone Number Integration** - Customer identification and ticket tracking
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
- **Security Headers** - Production-ready security configuration
- **Monorepo Structure** - Scalable architecture with separate deployments
- **Error Boundaries** - Comprehensive error handling and recovery

---

## 🏗️ **Tech Stack**

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js 14.2.5, React 18, TypeScript |
| **Styling** | Tailwind CSS, Lucide React Icons |
| **Backend** | Supabase (PostgreSQL, Auth, Real-time) |
| **Deployment** | Vercel (Production Ready) |
| **Development** | Hot Reload, TypeScript, ESLint |

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

| Document | Description |
|----------|-------------|
| [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) | Complete development setup |
| [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) | Production deployment |
| [DATABASE_SETUP.md](./DATABASE_SETUP.md) | Database schema and setup |
| [MVP_TESTING_GUIDE.md](./MVP_TESTING_GUIDE.md) | Testing procedures |
| [PROFILE_FEATURE_GUIDE.md](./PROFILE_FEATURE_GUIDE.md) | Profile system documentation |

---

## 🎯 **Production Status**

✅ **DEPLOYED & OPERATIONAL**

- [x] **Enterprise Authentication System** - Bulletproof session management with tab switching support
- [x] **Professional Loading Overlays** - Beautiful auth feedback with progress indicators  
- [x] **Organization and branch management** - Complete multi-tenant architecture
- [x] **Real-time queue updates** - Live WebSocket subscriptions with failover
- [x] **QR code generation** - Dynamic links with organization branding
- [x] **Mobile-responsive customer app** - Progressive Web App capabilities
- [x] **Profile management system** - Avatar upload and comprehensive user settings
- [x] **Advanced toast notification system** - App-wide feedback with animations
- [x] **Production deployment** - Fully deployed on Vercel with custom domains
- [x] **Security hardening** - Enterprise-grade security headers and authentication
- [x] **Error boundary system** - Comprehensive error handling and recovery

🚀 **RECENT ENHANCEMENTS (August 2025)**

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
