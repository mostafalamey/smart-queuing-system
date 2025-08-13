# 🎯 Smart Queue Management System

> **Professional SaaS Queue Management Solution**  
> Complete admin dashboard and customer application with real-time updates

[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Ready-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

## 🚀 **Live Demo**

- **Admin Dashboard**: [Coming Soon]
- **Customer App**: [Coming Soon]

---

## 📋 **Features**

### 🔐 **Admin Dashboard**
- **Authentication System** - Secure login with Supabase Auth
- **Organization Management** - Multi-tenant architecture
- **Branch & Department Management** - Hierarchical structure
- **Real-time Queue Monitoring** - Live updates with WebSocket
- **QR Code Generation** - Dynamic customer app links
- **User Invitation System** - Email-based team invitations
- **Profile Management** - Avatar upload and user settings
- **Professional UI** - Dark theme with responsive design

### 📱 **Customer Application**
- **Mobile-First Design** - Optimized for smartphones
- **Dynamic Theming** - Organization-branded experience
- **Real-time Updates** - Live queue status and notifications
- **Phone Number Integration** - Customer identification
- **Multi-language Ready** - Extensible localization
- **Offline Capabilities** - Progressive Web App features

### 🛠️ **Technical Features**
- **TypeScript** - Full type safety
- **Server-Side Rendering** - Next.js 14 App Router
- **Real-time Subscriptions** - Supabase WebSocket integration
- **Responsive Design** - Tailwind CSS framework
- **Production Ready** - Optimized builds and security headers
- **Monorepo Structure** - Separate admin and customer apps

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

## 🚀 **Quick Start**

### Prerequisites
- Node.js 18+ and npm 8+
- Supabase account and project

### Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/mostafalamey/smart-queuing-system.git
cd smart-queuing-system
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Configure environment variables**
```bash
# Copy and configure admin environment
cp admin/.env.production.template admin/.env.local

# Copy and configure customer environment  
cp customer/.env.production.template customer/.env.local
```

4. **Set up database**
- Import `DATABASE_SETUP.md` schema into your Supabase project

5. **Start development servers**
```bash
npm run dev
```

**Applications will be available at:**
- 📊 **Admin Dashboard**: http://localhost:3001
- 📱 **Customer App**: http://localhost:3002

---

## 📦 **Deployment**

### Vercel Deployment (Recommended)

This project is **production-ready** with Vercel configuration included.

1. **Create two Vercel projects:**
   - **Admin**: Root directory `admin`
   - **Customer**: Root directory `customer`

2. **Configure environment variables** (see `VERCEL_DEPLOYMENT_GUIDE.md`)

3. **Deploy and update URLs** in environment variables

**Detailed instructions**: [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)

---

## 📁 **Project Structure**

```
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

## 🎯 **MVP Status**

✅ **COMPLETED FEATURES**
- [x] Authentication system with Supabase
- [x] Organization and branch management
- [x] Real-time queue updates
- [x] QR code generation
- [x] Mobile-responsive customer app
- [x] Profile management with avatar upload
- [x] Toast notification system
- [x] Production deployment configuration

🚧 **UPCOMING FEATURES**
- [ ] WhatsApp notifications
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Mobile app (React Native)

---

## 🔒 **Security**

- **Environment Variables** - Secure configuration management
- **Authentication** - Supabase Auth with session management
- **CORS Protection** - Configured for production domains
- **SQL Injection Prevention** - Parameterized queries via Supabase
- **XSS Protection** - Security headers and content validation

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
