# Service-Level Queuing System Guide

## Overview

The Smart Queue System now supports **service-level queuing**, allowing customers to select specific services within departments for more precise queue management. This hierarchical system provides a four-tier structure: Organization → Branch → Department → Service.

## 🏗️ System Architecture

### Hierarchical Structure

```tree
Organization
├── Branch A
│   ├── Department 1
│   │   ├── Service A
│   │   ├── Service B
│   │   └── Service C
│   └── Department 2
│       ├── Service D
│       └── Service E
└── Branch B
    └── Department 3
        ├── Service F
        └── Service G
```

### Database Schema

The system utilizes a `services` table with the following structure:

```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🎯 Customer Experience Flow

### 1. QR Code Access

Customers can access the queue system through three types of QR codes:

- **General QR Code**: Full selection flow (organization → branch → department → service)
- **Branch-Specific QR Code**: Pre-selects branch (department → service selection)
- **Department-Specific QR Code**: Pre-selects department (service selection only)

### 2. Service Selection Process

1. **Organization Selection** (if using general QR)
2. **Branch Selection** (if not pre-selected)
3. **Department Selection** (if not pre-selected)
4. **Service Selection** - Choose specific service within department
5. **Phone Number Entry** - Customer identification
6. **Ticket Generation** - Alphanumeric ticket with service context

### 3. URL Parameter Structure

```url
https://customer-app.com/?org=ORG_ID&branch=BRANCH_ID&department=DEPT_ID
```

## 🛠️ Admin Dashboard Features

### Tree View Management Interface

The admin dashboard now features a **Tree View interface** for managing the organizational structure:

- **Visual Hierarchy**: Clear tree structure showing organization → branches → departments
- **Inline Editing**: Click to edit names directly in the tree
- **Contextual Actions**: Right-click or action buttons for add/edit/delete operations
- **Real-time Updates**: Changes reflect immediately across all connected users

### Enhanced QR Code Generation

The QR code generation system supports three tiers:

#### 1. Organization QR Codes

- **Purpose**: General access to organization
- **URL Format**: `?org=ORG_ID`
- **Customer Flow**: Full selection process

#### 2. Branch-Specific QR Codes

- **Purpose**: Direct access to specific branch
- **URL Format**: `?org=ORG_ID&branch=BRANCH_ID`
- **Customer Flow**: Department → Service selection

#### 3. Department-Specific QR Codes

- **Purpose**: Direct access to specific department
- **URL Format**: `?org=ORG_ID&branch=BRANCH_ID&department=DEPT_ID`
- **Customer Flow**: Service selection only

### QR Code Management Interface

Located in `/admin/organization`, the interface provides:

- **Tabbed Interface**: Separate tabs for General, Branch, and Department QR codes
- **Dynamic Generation**: QR codes generated on-demand
- **Multiple Actions**: Download, Copy Link, Print, and Refresh options
- **Organization Branding**: QR codes include organization logo and theming

## 🔧 Technical Implementation

### Customer App Changes

#### URL Persistence (`customer/src/lib/urlPersistence.ts`)

```typescript
interface URLParameters {
  organizationId?: string;
  branchId?: string;
  departmentId?: string;
}
```

#### Service Selection Logic (`customer/src/app/page.tsx`)

- Pre-selection logic for department-specific QR codes
- Service loading with proper RLS policy support
- Step flow management for service selection

#### Database Integration

- Services fetched from Supabase with anonymous access
- RLS policy allows public read access to active services
- Service ID stored in tickets for precise queue tracking

### Admin App Enhancements

#### QR Generation API (`admin/src/app/api/generate-qr/route.ts`)

```typescript
// Enhanced URL construction with department support
const url = new URL(customerUrl);
if (organizationId) url.searchParams.set('org', organizationId);
if (branchId) url.searchParams.set('branch', branchId);
if (departmentId) url.searchParams.set('department', departmentId);
```

#### Organization Page (`admin/src/app/organization/page.tsx`)

- Department QR tab with full functionality
- Department fetching and management
- Integrated QR actions (download, copy, print, refresh)

## 🔒 Security Implementation

### Row Level Security (RLS) Policy

```sql
-- Enable anonymous read access to active services
CREATE POLICY "Allow anonymous read access to active services"
ON services FOR SELECT
TO anon
USING (active = true);
```

This policy ensures:

- Anonymous users can view active services
- Inactive services are hidden from customers
- Full security maintained for admin operations

## 📊 Benefits of Service-Level Queuing

### For Customers

- **Precise Service Selection**: Choose exactly the service needed
- **Faster Flow**: Department-specific QR codes reduce selection steps
- **Better Experience**: Clear service descriptions and options
- **Reduced Wait Times**: More targeted queuing

### For Organizations

- **Detailed Analytics**: Service-level queue data and insights
- **Improved Resource Allocation**: Understand service demand patterns
- **Flexible QR Strategy**: Multiple QR types for different use cases
- **Enhanced Organization**: Clear service hierarchy and management

### For Staff

- **Service Context**: Know exactly which service customer needs
- **Better Preparation**: Service-specific preparation and resources
- **Improved Efficiency**: Targeted service delivery
- **Clear Queue Management**: Service-level queue visibility

## 🚀 Future Enhancements

- **Service-Specific Analytics**: Detailed reporting per service
- **Dynamic Service Management**: Enable/disable services based on availability
- **Service Categories**: Group related services for better organization
- **Time-Based Services**: Services available during specific hours
- **Staff Assignment**: Assign specific staff to services
- **Service Ratings**: Customer feedback system per service

## 📝 Migration Notes

Organizations upgrading to service-level queuing should:

1. **Create Services**: Add services to existing departments
2. **Update QR Codes**: Generate new department-specific QR codes
3. **Train Staff**: Familiarize with new Tree View interface
4. **Customer Communication**: Inform customers about service selection
5. **Monitor Analytics**: Track service-level queue patterns

The system maintains backward compatibility with existing tickets and queue flows.
