# Analytics Dashboard - Implementation Guide

## 📊 Overview

The Analytics Dashboard provides visual insights into queue performance, service efficiency, and operational metrics for Smart Queue System administrators and managers.

## 🏗️ Architecture

### Component Structure

```tree
analytics/
├── page.tsx                    # Main analytics page
├── types/
│   └── index.ts               # TypeScript interfaces
├── hooks/
│   └── useAnalyticsData.ts    # Data fetching and processing
└── features/
    ├── analytics-header/      # Page header with refresh
    ├── analytics-filters/     # Time and location filters
    ├── kpi-section/          # Key performance indicators
    ├── queue-performance/    # Charts and performance metrics
    └── volume-section/       # Volume distribution and stats
```

### Key Components

#### 1. **AnalyticsHeader**

- Page title and description
- Refresh button for real-time updates
- Visual icon and branding

#### 2. **AnalyticsFilters**

- Time range selection (Today, Last 7 Days, Last 30 Days)
- Branch and department filtering
- Live status indicator

#### 3. **KPISection**

- Average wait time visualization
- Average service time metrics
- Completion rate with performance indicators
- Current waiting count with color-coded alerts

#### 4. **QueuePerformanceSection**

- Wait time trend line chart (SVG-based)
- Department performance comparison (bar chart)
- Performance summary statistics

#### 5. **VolumeSection**

- Service distribution pie chart
- Ticket volume breakdown
- Throughput analysis with efficiency metrics

## 📈 Analytics Metrics

### Core KPIs

- **Average Wait Time**: Time from ticket creation to service call
- **Average Service Time**: Time from call to completion
- **Completion Rate**: Percentage of tickets successfully served
- **Current Waiting**: Live count of tickets in queue

### Performance Analytics

- **Wait Time Trends**: Daily/weekly patterns
- **Department Comparison**: Cross-department efficiency
- **Peak Hours Analysis**: Traffic pattern identification
- **Service Distribution**: Popular services analysis

### Volume Metrics

- **Tickets Issued vs Served**: Conversion tracking
- **Processing Rate**: Tickets per hour calculation
- **Queue Clear Time**: Estimated time to process current queue

## 🔒 Access Control

### Role-Based Permissions

- **Admin**: Full analytics access across all branches/departments
- **Manager**: Analytics for assigned branch only
- **Employee**: No analytics access

### Data Filtering

- Automatic branch filtering for managers
- Department-level granular filtering
- Time-based data segmentation

## 🎨 Visual Design

### Charts & Visualizations

- **SVG-based charts** - No external libraries required
- **Responsive design** - Works on all screen sizes
- **Color-coded metrics** - Intuitive performance indicators
- **Interactive elements** - Hover states and visual feedback

### Design System

- Consistent with existing Smart Queue branding
- Tailwind CSS for styling
- Lucide React icons for consistency
- Gradient backgrounds for visual hierarchy

## 🔄 Real-Time Features

### Data Updates

- Manual refresh button for latest data
- Automatic date range calculations
- Live status indicators

### Performance Optimization

- Efficient database queries with date filtering
- Client-side data processing and aggregation
- Minimal re-renders with proper React hooks

## 📊 Data Processing

### Source Data

- **Tickets table**: Primary data source for all metrics
- **Departments/Services**: Organizational structure
- **Real-time status**: Current queue state

### Processing Logic

```typescript
// Wait time calculation
waitTime = called_at - created_at;

// Service time calculation
serviceTime = completed_at - called_at;

// Completion rate
completionRate = (servedTickets / totalTickets) * 100;
```

### Aggregations

- Daily averages for trend analysis
- Department-level performance summaries
- Service distribution percentages

## 🚀 Usage

### Navigation

1. Access via sidebar "Analytics" tab
2. Available to Admin and Manager roles only
3. Automatic role-based filtering applied

### Filtering Data

1. Select time range from dropdown
2. Choose specific branch (if admin)
3. Filter by department if needed
4. Data updates automatically

### Reading Metrics

- **Green indicators**: Good performance
- **Yellow indicators**: Needs attention
- **Red indicators**: Poor performance
- **Trend arrows**: Performance direction

## 🔧 Technical Implementation

### Dependencies

- **Next.js 14**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Lucide React**: Icons
- **Supabase**: Database queries

### No External Chart Libraries

- Custom SVG-based visualizations
- Lightweight and performant
- Fully customizable styling
- No additional bundle size

### Error Handling

- Graceful fallbacks for missing data
- Loading states for better UX
- Connection error recovery
- User-friendly error messages

## 📱 Responsive Design

### Mobile Support

- Stacked layouts on small screens
- Touch-friendly interactive elements
- Readable chart labels and text
- Optimized for both tablet and mobile

### Desktop Experience

- Multi-column layouts
- Larger chart visualizations
- Enhanced hover interactions
- Maximum information density

---

## 🏁 Quick Start

1. **Access**: Navigate to `/analytics` in admin dashboard
2. **Filter**: Select appropriate time range and location
3. **Analyze**: Review KPIs, trends, and performance metrics
4. **Export**: Use data insights for operational decisions

The analytics dashboard provides actionable insights to optimize queue management and improve customer experience across your organization.
