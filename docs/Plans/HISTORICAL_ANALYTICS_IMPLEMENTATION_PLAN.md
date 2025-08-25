# Historical Analytics - Implementation Status & Phase 3 Planning

## Executive Summary

This document tracks the comprehensive analytics implementation progress and outlines the roadmap for Phase 3.

**Current Status**: Phase 1 (Backend) and Phase 2 (Frontend Styling) Complete ✅  
**Next Phase**: Enhanced Analytics Features & Customer Experience  
**Updated**: August 25, 2025

---

## ✅ **PHASES 1 & 2 COMPLETED**

### **Phase 1: Historical Analytics Data System** - COMPLETE

- ✅ Database schema with analytics tables
- ✅ Data processing functions
- ✅ Edge function integration
- ✅ Row Level Security implementation
- ✅ Historical data preservation system

### **Phase 2: Analytics UI & Styling Consistency** - COMPLETE

- ✅ Unified styling system with globals.css
- ✅ Consistent card layouts across all components
- ✅ Responsive design with vertical layouts
- ✅ Professional visual appearance
- ✅ Data visualization with safety checks
- ✅ Mobile-optimized interface

---

## 🎯 **PHASE 3 OBJECTIVES**

Building on the solid foundation of Phases 1 & 2, Phase 3 focuses on:

### **3.1 Enhanced Analytics Controls**

- Advanced date range selection with presets
- Multi-dimensional filtering (department, service, employee, time)
- Export functionality (PDF, CSV, scheduled reports)
- Real-time data refresh with WebSocket integration

### **3.2 Customer Experience Enhancement**

- Accurate wait time estimation using historical patterns
- Real-time queue position tracking
- Mobile-optimized customer interface
- Push notifications for queue updates

### **3.3 Intelligence & Insights**

- Automated trend detection algorithms
- Performance optimization recommendations
- Alert system for anomalies and thresholds
- Comparative analytics and benchmarking

---

## Current System Status (Post Phase 1 & 2)

### Analytics Infrastructure - COMPLETED ✅

#### Database Layer

- **Analytics Tables**: `daily_analytics`, `service_analytics`, `employee_performance_analytics`, `notification_analytics`
- **Data Processing**: Automated functions process historical data before cleanup
- **Security**: Row Level Security (RLS) with organization-based access control
- **Performance**: Optimized indexes and query performance

#### Edge Function Integration

- **Frequency**: Every 24 hours with analytics processing
- **Process**: Analytics data captured → processed → stored before cleanup
- **Reliability**: Comprehensive error handling and fallback mechanisms
- **Archive System**: Enhanced with analytics preservation

#### Frontend Analytics System - COMPLETED ✅

- **Real-time Analytics**: Live dashboard with current queue metrics
- **Historical Analytics**: Trends, patterns, and comparative analysis
- **Consistent UI**: Professional styling with unified card layouts
- **Responsive Design**: Mobile-optimized with vertical layouts
- **Data Visualization**: Safe progress bars, charts, and interactive elements

### Current Capabilities

#### Available Analytics

- **Queue Performance**: Average wait times, service times, completion rates
- **Volume Analysis**: Daily/weekly/monthly ticket volumes and patterns
- **Peak Patterns**: Hourly and daily pattern analysis with visualization
- **Historical Trends**: Long-term trend analysis with comparative metrics
- **Predictive Insights**: Basic forecasting and pattern recognition
- **Employee Performance**: Service efficiency and productivity metrics

#### Data Retention

- **Live Data**: Current tickets and real-time queue status
- **Historical Data**: Unlimited retention of processed analytics
- **Trend Analysis**: 6+ months of historical patterns available
- **Comparative Metrics**: Year-over-year and period-over-period analysis

---

## Phase 3 Analytics Requirements Analysis

### Enhanced Features Needed

Based on current system capabilities and user feedback:

#### Advanced Analytics Controls

- **Enhanced Filtering**: Multi-dimensional filtering by department, service, employee, date ranges
- **Custom Date Ranges**: Flexible date selection with presets (today, week, month, quarter, year, custom)
- **Export Functionality**: PDF reports, CSV data export, scheduled email reports
- **Real-time Controls**: Live data refresh, WebSocket integration, update frequency controls

#### Customer-Facing Improvements

- **Accurate Wait Time Estimation**: ML-enhanced predictions using historical patterns + real-time queue
- **Queue Position Tracking**: Real-time position updates with estimated time to service
- **Service Availability**: Live status indicators for services and departments
- **Mobile Optimization**: PWA features, offline capability, push notifications

#### Intelligence & Insights

- **Automated Trend Detection**: Algorithm-based identification of significant changes and patterns
- **Performance Recommendations**: AI-powered suggestions for operational improvements
- **Comparative Analytics**: Benchmarking against historical performance and industry standards
- **Alert System**: Configurable alerts for thresholds, anomalies, and performance issues

### Phase 3 Data Requirements

#### Enhanced Real-time Data

1. **Live Queue Metrics**: Current wait times, queue lengths, service availability
2. **Employee Status**: Active staff, service rates, current workload
3. **Customer Behavior**: Real-time engagement metrics, mobile app usage
4. **System Performance**: Response times, error rates, user satisfaction

#### Advanced Analytics Features

1. **Predictive Models**: Wait time estimation, volume forecasting, capacity planning
2. **Pattern Recognition**: Seasonal trends, peak period identification, anomaly detection
3. **Performance Optimization**: Bottleneck analysis, efficiency recommendations
4. **Customer Journey**: End-to-end experience tracking and optimization

#### Business Intelligence Integration

1. **Custom Dashboards**: Personalized analytics views for different user roles
2. **Automated Reporting**: Scheduled reports with key insights and recommendations
3. **Data Export**: API access for third-party BI tools and custom integrations
4. **Multi-tenant Analytics**: Cross-organization benchmarking and best practices

---

## Technical Implementation Plan

### Phase 1: Analytics Data Schema Design

#### 1.1 Create Historical Analytics Tables

```sql
-- Daily aggregated analytics
CREATE TABLE daily_analytics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date date NOT NULL,
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
    department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
    service_id uuid REFERENCES services(id) ON DELETE CASCADE,

    -- Volume metrics
    tickets_issued integer DEFAULT 0,
    tickets_served integer DEFAULT 0,
    tickets_cancelled integer DEFAULT 0,
    tickets_no_show integer DEFAULT 0,

    -- Wait time metrics (in minutes)
    avg_wait_time numeric(10,2) DEFAULT 0,
    min_wait_time numeric(10,2) DEFAULT 0,
    max_wait_time numeric(10,2) DEFAULT 0,
    median_wait_time numeric(10,2) DEFAULT 0,

    -- Service time metrics (in minutes)
    avg_service_time numeric(10,2) DEFAULT 0,
    min_service_time numeric(10,2) DEFAULT 0,
    max_service_time numeric(10,2) DEFAULT 0,
    median_service_time numeric(10,2) DEFAULT 0,

    -- Hourly distribution (JSON array of 24 hour buckets)
    hourly_ticket_distribution jsonb DEFAULT '[]',
    hourly_wait_times jsonb DEFAULT '[]',
    hourly_service_times jsonb DEFAULT '[]',

    -- Performance indicators
    completion_rate numeric(5,2) DEFAULT 0, -- percentage
    no_show_rate numeric(5,2) DEFAULT 0,    -- percentage
    peak_wait_time_hour integer,            -- 0-23

    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Employee performance analytics
CREATE TABLE employee_performance_analytics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date date NOT NULL,
    employee_id uuid REFERENCES members(id) ON DELETE CASCADE,
    department_id uuid REFERENCES departments(id) ON DELETE CASCADE,

    -- Volume metrics
    tickets_served integer DEFAULT 0,
    active_hours numeric(4,2) DEFAULT 0, -- hours worked

    -- Performance metrics
    avg_service_time numeric(10,2) DEFAULT 0,
    min_service_time numeric(10,2) DEFAULT 0,
    max_service_time numeric(10,2) DEFAULT 0,
    tickets_per_hour numeric(6,2) DEFAULT 0,

    -- Service quality indicators
    customer_satisfaction_score numeric(3,2), -- if feedback implemented
    sla_breach_count integer DEFAULT 0,

    created_at timestamp with time zone DEFAULT now()
);

-- Service type analytics
CREATE TABLE service_analytics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date date NOT NULL,
    service_id uuid REFERENCES services(id) ON DELETE CASCADE,
    department_id uuid REFERENCES departments(id) ON DELETE CASCADE,

    -- Volume metrics
    tickets_issued integer DEFAULT 0,
    tickets_served integer DEFAULT 0,

    -- Performance metrics
    avg_wait_time numeric(10,2) DEFAULT 0,
    avg_service_time numeric(10,2) DEFAULT 0,

    -- Efficiency indicators
    utilization_rate numeric(5,2) DEFAULT 0, -- percentage
    capacity_exceeded_hours integer DEFAULT 0,

    created_at timestamp with time zone DEFAULT now()
);

-- Notification effectiveness analytics
CREATE TABLE notification_analytics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date date NOT NULL,
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

    -- Volume metrics
    total_notifications integer DEFAULT 0,
    successful_notifications integer DEFAULT 0,
    failed_notifications integer DEFAULT 0,

    -- Effectiveness metrics
    response_rate numeric(5,2) DEFAULT 0,          -- % who showed up after notification
    avg_response_time numeric(10,2) DEFAULT 0,     -- minutes from notification to arrival

    -- Distribution by type
    call_notifications integer DEFAULT 0,
    ready_notifications integer DEFAULT 0,
    reminder_notifications integer DEFAULT 0,

    created_at timestamp with time zone DEFAULT now()
);
```

#### 1.2 Create Indexes and Constraints

```sql
-- Performance indexes
CREATE INDEX idx_daily_analytics_date_org ON daily_analytics(date, organization_id);
CREATE INDEX idx_daily_analytics_branch_dept ON daily_analytics(branch_id, department_id);
CREATE INDEX idx_employee_performance_date ON employee_performance_analytics(date, employee_id);
CREATE INDEX idx_service_analytics_date ON service_analytics(date, service_id);
CREATE INDEX idx_notification_analytics_date ON notification_analytics(date, organization_id);

-- Unique constraints to prevent duplicates
CREATE UNIQUE INDEX idx_daily_analytics_unique ON daily_analytics(date, organization_id, branch_id, department_id, service_id);
CREATE UNIQUE INDEX idx_employee_performance_unique ON employee_performance_analytics(date, employee_id, department_id);
CREATE UNIQUE INDEX idx_service_analytics_unique ON service_analytics(date, service_id);
CREATE UNIQUE INDEX idx_notification_analytics_unique ON notification_analytics(date, organization_id);
```

#### 1.3 Row Level Security Setup

```sql
-- Enable RLS on all analytics tables
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies (organization-based access)
CREATE POLICY "daily_analytics_org_access" ON daily_analytics
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM members WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "employee_performance_org_access" ON employee_performance_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members m
            JOIN departments d ON d.id = employee_performance_analytics.department_id
            WHERE m.auth_user_id = auth.uid()
            AND m.organization_id = d.organization_id
        )
    );

CREATE POLICY "service_analytics_org_access" ON service_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members m
            JOIN departments d ON d.id = service_analytics.department_id
            WHERE m.auth_user_id = auth.uid()
            AND m.organization_id = d.organization_id
        )
    );

CREATE POLICY "notification_analytics_org_access" ON notification_analytics
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM members WHERE auth_user_id = auth.uid()
        )
    );
```

### Phase 2: Data Processing Functions

#### 2.1 Analytics Data Processing Functions

```sql
-- Function to process daily analytics from tickets
CREATE OR REPLACE FUNCTION process_daily_analytics(
    target_date date DEFAULT (CURRENT_DATE - INTERVAL '1 day')::date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert/Update daily analytics with comprehensive metrics
    INSERT INTO daily_analytics (
        date, organization_id, branch_id, department_id, service_id,
        tickets_issued, tickets_served, tickets_cancelled, tickets_no_show,
        avg_wait_time, min_wait_time, max_wait_time, median_wait_time,
        avg_service_time, min_service_time, max_service_time, median_service_time,
        hourly_ticket_distribution, hourly_wait_times, hourly_service_times,
        completion_rate, no_show_rate, peak_wait_time_hour
    )
    SELECT
        target_date::date,
        d.organization_id,
        d.branch_id,
        t.department_id,
        COALESCE(t.service_id, '00000000-0000-0000-0000-000000000000'::uuid),

        -- Volume metrics
        COUNT(*) as tickets_issued,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as tickets_served,
        COUNT(CASE WHEN t.status = 'cancelled' THEN 1 END) as tickets_cancelled,
        COUNT(CASE WHEN t.status = 'no_show' THEN 1 END) as tickets_no_show,

        -- Wait time metrics (in minutes)
        COALESCE(AVG(EXTRACT(EPOCH FROM (t.called_at - t.created_at))/60)::numeric(10,2), 0) as avg_wait_time,
        COALESCE(MIN(EXTRACT(EPOCH FROM (t.called_at - t.created_at))/60)::numeric(10,2), 0) as min_wait_time,
        COALESCE(MAX(EXTRACT(EPOCH FROM (t.called_at - t.created_at))/60)::numeric(10,2), 0) as max_wait_time,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (t.called_at - t.created_at))/60)::numeric(10,2), 0) as median_wait_time,

        -- Service time metrics
        COALESCE(AVG(EXTRACT(EPOCH FROM (t.completed_at - t.called_at))/60)::numeric(10,2), 0) as avg_service_time,
        COALESCE(MIN(EXTRACT(EPOCH FROM (t.completed_at - t.called_at))/60)::numeric(10,2), 0) as min_service_time,
        COALESCE(MAX(EXTRACT(EPOCH FROM (t.completed_at - t.called_at))/60)::numeric(10,2), 0) as max_service_time,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (t.completed_at - t.called_at))/60)::numeric(10,2), 0) as median_service_time,

        -- Hourly distributions (simplified - will be calculated in separate function)
        generate_hourly_ticket_distribution(target_date, t.department_id, COALESCE(t.service_id, '00000000-0000-0000-0000-000000000000'::uuid)),
        generate_hourly_wait_times(target_date, t.department_id, COALESCE(t.service_id, '00000000-0000-0000-0000-000000000000'::uuid)),
        generate_hourly_service_times(target_date, t.department_id, COALESCE(t.service_id, '00000000-0000-0000-0000-000000000000'::uuid)),

        -- Performance indicators
        CASE
            WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::numeric / COUNT(*)::numeric * 100)::numeric(5,2)
            ELSE 0::numeric(5,2)
        END as completion_rate,

        CASE
            WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN t.status = 'no_show' THEN 1 END)::numeric / COUNT(*)::numeric * 100)::numeric(5,2)
            ELSE 0::numeric(5,2)
        END as no_show_rate,

        -- Peak wait time hour
        get_peak_wait_time_hour(target_date, t.department_id, COALESCE(t.service_id, '00000000-0000-0000-0000-000000000000'::uuid))

    FROM tickets t
    JOIN departments d ON d.id = t.department_id
    WHERE t.created_at >= target_date::timestamp
      AND t.created_at < (target_date + INTERVAL '1 day')::timestamp
    GROUP BY d.organization_id, d.branch_id, t.department_id, COALESCE(t.service_id, '00000000-0000-0000-0000-000000000000'::uuid)

    ON CONFLICT (date, organization_id, branch_id, department_id, service_id)
    DO UPDATE SET
        tickets_issued = EXCLUDED.tickets_issued,
        tickets_served = EXCLUDED.tickets_served,
        tickets_cancelled = EXCLUDED.tickets_cancelled,
        tickets_no_show = EXCLUDED.tickets_no_show,
        avg_wait_time = EXCLUDED.avg_wait_time,
        min_wait_time = EXCLUDED.min_wait_time,
        max_wait_time = EXCLUDED.max_wait_time,
        median_wait_time = EXCLUDED.median_wait_time,
        avg_service_time = EXCLUDED.avg_service_time,
        min_service_time = EXCLUDED.min_service_time,
        max_service_time = EXCLUDED.max_service_time,
        median_service_time = EXCLUDED.median_service_time,
        hourly_ticket_distribution = EXCLUDED.hourly_ticket_distribution,
        hourly_wait_times = EXCLUDED.hourly_wait_times,
        hourly_service_times = EXCLUDED.hourly_service_times,
        completion_rate = EXCLUDED.completion_rate,
        no_show_rate = EXCLUDED.no_show_rate,
        peak_wait_time_hour = EXCLUDED.peak_wait_time_hour,
        updated_at = now();
END;
$$;

-- Helper functions for hourly data processing
CREATE OR REPLACE FUNCTION generate_hourly_ticket_distribution(
    target_date date,
    dept_id uuid,
    serv_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    hourly_data jsonb := '[]'::jsonb;
    hour_bucket integer;
BEGIN
    FOR hour_bucket IN 0..23 LOOP
        SELECT hourly_data || jsonb_build_object(
            'hour', hour_bucket,
            'count', COALESCE(COUNT(*), 0)
        )
        INTO hourly_data
        FROM tickets
        WHERE department_id = dept_id
          AND (serv_id IS NULL OR service_id = serv_id)
          AND created_at >= target_date::timestamp + (hour_bucket || ' hours')::interval
          AND created_at < target_date::timestamp + ((hour_bucket + 1) || ' hours')::interval;
    END LOOP;

    RETURN hourly_data;
END;
$$;

-- Similar helper functions for hourly wait times and service times...
```

#### 2.2 Employee and Service Analytics Functions

```sql
-- Function to process employee performance analytics
CREATE OR REPLACE FUNCTION process_employee_analytics(
    target_date date DEFAULT (CURRENT_DATE - INTERVAL '1 day')::date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO employee_performance_analytics (
        date, employee_id, department_id,
        tickets_served, active_hours, avg_service_time, min_service_time, max_service_time,
        tickets_per_hour, sla_breach_count
    )
    SELECT
        target_date::date,
        m.id as employee_id,
        t.department_id,

        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as tickets_served,
        -- Calculate active hours based on first to last service
        COALESCE(EXTRACT(EPOCH FROM (MAX(t.completed_at) - MIN(t.called_at)))/3600::numeric(4,2), 0) as active_hours,

        -- Service time metrics
        COALESCE(AVG(EXTRACT(EPOCH FROM (t.completed_at - t.called_at))/60)::numeric(10,2), 0) as avg_service_time,
        COALESCE(MIN(EXTRACT(EPOCH FROM (t.completed_at - t.called_at))/60)::numeric(10,2), 0) as min_service_time,
        COALESCE(MAX(EXTRACT(EPOCH FROM (t.completed_at - t.called_at))/60)::numeric(10,2), 0) as max_service_time,

        -- Performance metrics
        CASE
            WHEN EXTRACT(EPOCH FROM (MAX(t.completed_at) - MIN(t.called_at)))/3600 > 0
            THEN (COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::numeric / (EXTRACT(EPOCH FROM (MAX(t.completed_at) - MIN(t.called_at)))/3600))::numeric(6,2)
            ELSE 0::numeric(6,2)
        END as tickets_per_hour,

        -- SLA breaches (assuming 15 minute SLA)
        COUNT(CASE WHEN EXTRACT(EPOCH FROM (t.called_at - t.created_at))/60 > 15 THEN 1 END) as sla_breach_count

    FROM tickets t
    JOIN queue_operations qo ON qo.ticket_id = t.id  -- Assuming we track who served which ticket
    JOIN members m ON m.id = qo.employee_id
    WHERE t.created_at >= target_date::timestamp
      AND t.created_at < (target_date + INTERVAL '1 day')::timestamp
      AND t.status = 'completed'
    GROUP BY m.id, t.department_id

    ON CONFLICT (date, employee_id, department_id)
    DO UPDATE SET
        tickets_served = EXCLUDED.tickets_served,
        active_hours = EXCLUDED.active_hours,
        avg_service_time = EXCLUDED.avg_service_time,
        min_service_time = EXCLUDED.min_service_time,
        max_service_time = EXCLUDED.max_service_time,
        tickets_per_hour = EXCLUDED.tickets_per_hour,
        sla_breach_count = EXCLUDED.sla_breach_count;
END;
$$;

-- Function to process service analytics
CREATE OR REPLACE FUNCTION process_service_analytics(
    target_date date DEFAULT (CURRENT_DATE - INTERVAL '1 day')::date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO service_analytics (
        date, service_id, department_id,
        tickets_issued, tickets_served, avg_wait_time, avg_service_time,
        utilization_rate, capacity_exceeded_hours
    )
    SELECT
        target_date::date,
        t.service_id,
        t.department_id,

        COUNT(*) as tickets_issued,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as tickets_served,
        COALESCE(AVG(EXTRACT(EPOCH FROM (t.called_at - t.created_at))/60)::numeric(10,2), 0) as avg_wait_time,
        COALESCE(AVG(EXTRACT(EPOCH FROM (t.completed_at - t.called_at))/60)::numeric(10,2), 0) as avg_service_time,

        -- Utilization rate (served vs estimated capacity)
        CASE
            WHEN s.max_daily_capacity > 0 THEN
                (COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::numeric / s.max_daily_capacity::numeric * 100)::numeric(5,2)
            ELSE 0::numeric(5,2)
        END as utilization_rate,

        -- Hours when capacity was exceeded (simplified)
        CASE
            WHEN s.max_daily_capacity > 0 THEN
                GREATEST(0, COUNT(*) - s.max_daily_capacity) / GREATEST(1, COUNT(*) / 24)
            ELSE 0
        END as capacity_exceeded_hours

    FROM tickets t
    JOIN services s ON s.id = t.service_id
    WHERE t.created_at >= target_date::timestamp
      AND t.created_at < (target_date + INTERVAL '1 day')::timestamp
      AND t.service_id IS NOT NULL
    GROUP BY t.service_id, t.department_id, s.max_daily_capacity

    ON CONFLICT (date, service_id)
    DO UPDATE SET
        tickets_issued = EXCLUDED.tickets_issued,
        tickets_served = EXCLUDED.tickets_served,
        avg_wait_time = EXCLUDED.avg_wait_time,
        avg_service_time = EXCLUDED.avg_service_time,
        utilization_rate = EXCLUDED.utilization_rate,
        capacity_exceeded_hours = EXCLUDED.capacity_exceeded_hours;
END;
$$;
```

#### 2.3 Notification Analytics Processing

```sql
-- Function to process notification effectiveness analytics
CREATE OR REPLACE FUNCTION process_notification_analytics(
    target_date date DEFAULT (CURRENT_DATE - INTERVAL '1 day')::date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO notification_analytics (
        date, organization_id,
        total_notifications, successful_notifications, failed_notifications,
        response_rate, avg_response_time,
        call_notifications, ready_notifications, reminder_notifications
    )
    SELECT
        target_date::date,
        d.organization_id,

        COUNT(nl.*) as total_notifications,
        COUNT(CASE WHEN nl.status = 'sent' THEN 1 END) as successful_notifications,
        COUNT(CASE WHEN nl.status = 'failed' THEN 1 END) as failed_notifications,

        -- Response rate (customers who showed up after notification)
        CASE
            WHEN COUNT(CASE WHEN nl.status = 'sent' THEN 1 END) > 0 THEN
                (COUNT(CASE WHEN nl.status = 'sent' AND t.status IN ('serving', 'completed') THEN 1 END)::numeric /
                 COUNT(CASE WHEN nl.status = 'sent' THEN 1 END)::numeric * 100)::numeric(5,2)
            ELSE 0::numeric(5,2)
        END as response_rate,

        -- Average response time (notification to arrival - simplified)
        COALESCE(AVG(EXTRACT(EPOCH FROM (t.called_at - nl.created_at))/60)::numeric(10,2), 0) as avg_response_time,

        -- Notification type distribution
        COUNT(CASE WHEN nl.message ILIKE '%call%' OR nl.message ILIKE '%turn%' THEN 1 END) as call_notifications,
        COUNT(CASE WHEN nl.message ILIKE '%ready%' OR nl.message ILIKE '%prepare%' THEN 1 END) as ready_notifications,
        COUNT(CASE WHEN nl.message ILIKE '%reminder%' OR nl.message ILIKE '%wait%' THEN 1 END) as reminder_notifications

    FROM notification_logs nl
    JOIN tickets t ON t.customer_phone = nl.phone
    JOIN departments d ON d.id = t.department_id
    WHERE nl.created_at >= target_date::timestamp
      AND nl.created_at < (target_date + INTERVAL '1 day')::timestamp
    GROUP BY d.organization_id

    ON CONFLICT (date, organization_id)
    DO UPDATE SET
        total_notifications = EXCLUDED.total_notifications,
        successful_notifications = EXCLUDED.successful_notifications,
        failed_notifications = EXCLUDED.failed_notifications,
        response_rate = EXCLUDED.response_rate,
        avg_response_time = EXCLUDED.avg_response_time,
        call_notifications = EXCLUDED.call_notifications,
        ready_notifications = EXCLUDED.ready_notifications,
        reminder_notifications = EXCLUDED.reminder_notifications;
END;
$$;
```

### Phase 3: Edge Function Integration

#### 3.1 Modified Edge Function Workflow

The edge function needs to be updated to process analytics before cleanup:

```typescript
// Updated workflow in cleanup-database/index.ts
async function cleanupOrganization(
  supabase: any,
  organization: { id: string; name: string },
  config: Required<CleanupRequest>
): Promise<CleanupResult> {
  try {
    // STEP 1: Process analytics BEFORE cleanup
    console.log(
      `Processing analytics for ${organization.name} before cleanup...`
    );

    // Process yesterday's data (the day we're about to clean up)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const targetDate = yesterday.toISOString().split("T")[0];

    await processAnalyticsBeforeCleanup(supabase, organization.id, targetDate);

    // STEP 2: Continue with existing cleanup process
    if (config.cleanupType === "tickets" || config.cleanupType === "both") {
      // ... existing ticket cleanup code
    }

    if (
      config.cleanupType === "notifications" ||
      config.cleanupType === "both"
    ) {
      // ... existing notification cleanup code
    }
  } catch (error) {
    // ... error handling
  }
}

// New analytics processing function
async function processAnalyticsBeforeCleanup(
  supabase: any,
  organizationId: string,
  targetDate: string
): Promise<void> {
  try {
    // Process daily analytics
    const { error: dailyError } = await supabase.rpc(
      "process_daily_analytics",
      {
        target_date: targetDate,
      }
    );

    if (dailyError) {
      console.error("Error processing daily analytics:", dailyError);
      throw dailyError;
    }

    // Process employee analytics
    const { error: employeeError } = await supabase.rpc(
      "process_employee_analytics",
      {
        target_date: targetDate,
      }
    );

    if (employeeError) {
      console.error("Error processing employee analytics:", employeeError);
      throw employeeError;
    }

    // Process service analytics
    const { error: serviceError } = await supabase.rpc(
      "process_service_analytics",
      {
        target_date: targetDate,
      }
    );

    if (serviceError) {
      console.error("Error processing service analytics:", serviceError);
      throw serviceError;
    }

    // Process notification analytics
    const { error: notificationError } = await supabase.rpc(
      "process_notification_analytics",
      {
        target_date: targetDate,
      }
    );

    if (notificationError) {
      console.error(
        "Error processing notification analytics:",
        notificationError
      );
      throw notificationError;
    }

    console.log(`✅ Analytics processing completed for ${targetDate}`);
  } catch (error) {
    console.error(`❌ Analytics processing failed for ${targetDate}:`, error);
    // Don't throw - allow cleanup to continue even if analytics fails
  }
}
```

#### 3.2 Enhanced Cleanup Result Reporting

```typescript
// Updated CleanupResult interface
interface CleanupResult {
  success: boolean;
  organizationId?: string;
  organizationName?: string;
  ticketsProcessed: number;
  ticketsArchived: number;
  notificationsProcessed: number;
  totalExecutionTimeMs: number;

  // New analytics processing info
  analyticsProcessed: {
    dailyAnalytics: boolean;
    employeeAnalytics: boolean;
    serviceAnalytics: boolean;
    notificationAnalytics: boolean;
    processedDate: string;
    errors: string[];
  };

  details: {
    ticketsDeleted: number;
    successfulNotificationsDeleted: number;
    failedNotificationsDeleted: number;
    errors: string[];
  };
  recommendations?: string[];
}
```

### Phase 4: Enhanced Analytics Frontend Integration

#### 4.1 Updated Analytics Data Hook

```typescript
// Updated useAnalyticsData.ts to use historical data

export const useAnalyticsData = () => {
  // ... existing state

  // New historical data fetching
  const fetchHistoricalAnalytics = useCallback(async () => {
    if (!selectedBranch) return;

    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange();

      // Fetch from historical analytics tables instead of live tickets
      const { data: historicalData, error: histError } = await supabase
        .from("daily_analytics")
        .select(
          `
          *,
          departments(name, id),
          services(name, id)  
        `
        )
        .gte("date", startDate.split("T")[0])
        .lte("date", endDate.split("T")[0])
        .eq("branch_id", selectedBranch)
        .eq("department_id", selectedDepartment || null);

      if (histError) throw histError;

      // Process historical data for analytics display
      const processedData = processHistoricalData(historicalData || []);
      setAnalyticsData(processedData);
    } catch (error) {
      logger.error("Error fetching historical analytics:", error);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, selectedDepartment, getDateRange]);

  // Enhanced data processing for historical analytics
  const processHistoricalData = (historicalData: any[]): AnalyticsData => {
    const totalTickets = historicalData.reduce(
      (sum, d) => sum + d.tickets_issued,
      0
    );
    const totalServed = historicalData.reduce(
      (sum, d) => sum + d.tickets_served,
      0
    );

    // Calculate weighted averages
    const avgWaitTime =
      totalTickets > 0
        ? historicalData.reduce(
            (sum, d) => sum + d.avg_wait_time * d.tickets_issued,
            0
          ) / totalTickets
        : 0;

    const avgServiceTime =
      totalServed > 0
        ? historicalData.reduce(
            (sum, d) => sum + d.avg_service_time * d.tickets_served,
            0
          ) / totalServed
        : 0;

    // Generate trends from daily data
    const waitTimeTrend = historicalData.map((d) => ({
      date: d.date,
      avgWaitTime: d.avg_wait_time,
      ticketCount: d.tickets_issued,
    }));

    // Department performance from aggregated data
    const departmentPerformance =
      generateDepartmentPerformanceFromHistorical(historicalData);

    // Service distribution
    const serviceDistribution =
      generateServiceDistributionFromHistorical(historicalData);

    return {
      avgWaitTime: Math.round(avgWaitTime * 10) / 10,
      avgServiceTime: Math.round(avgServiceTime * 10) / 10,
      ticketsIssued: totalTickets,
      ticketsServed: totalServed,
      noShowRate:
        totalTickets > 0
          ? historicalData.reduce(
              (sum, d) => sum + d.no_show_rate * d.tickets_issued,
              0
            ) / totalTickets
          : 0,
      completionRate: totalTickets > 0 ? (totalServed / totalTickets) * 100 : 0,
      currentWaiting: 0, // This would need live data
      waitTimeTrend,
      peakHours: extractPeakHoursFromHistorical(historicalData),
      departmentPerformance,
      serviceDistribution,
      notificationStats:
        calculateNotificationStatsFromHistorical(historicalData),
    };
  };

  // ... rest of implementation
};
```

#### 4.2 Real-time Wait Time Estimation

```typescript
// New hook for customer wait time estimation
export const useWaitTimeEstimation = () => {
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<number>(0);
  const [confidenceLevel, setConfidenceLevel] = useState<
    "high" | "medium" | "low"
  >("medium");

  const calculateEstimatedWaitTime = useCallback(
    async (
      departmentId: string,
      serviceId?: string,
      currentPosition?: number
    ) => {
      try {
        // Get historical data for this time of day and day of week
        const now = new Date();
        const hourOfDay = now.getHours();
        const dayOfWeek = now.getDay();

        // Fetch recent historical patterns
        const { data: recentPatterns, error } = await supabase
          .from("daily_analytics")
          .select(
            "avg_wait_time, avg_service_time, hourly_wait_times, hourly_service_times"
          )
          .eq("department_id", departmentId)
          .eq("service_id", serviceId || null)
          .gte(
            "date",
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0]
          )
          .order("date", { ascending: false });

        if (error) throw error;

        // Get current queue status
        const { data: currentQueue, error: queueError } = await supabase
          .from("tickets")
          .select("status, created_at, called_at")
          .eq("department_id", departmentId)
          .in("status", ["waiting", "serving"]);

        if (queueError) throw queueError;

        // Calculate estimation based on:
        // 1. Historical wait times for this hour/day pattern
        // 2. Current queue length
        // 3. Recent service times
        const estimation = calculateWaitTimeEstimation({
          recentPatterns: recentPatterns || [],
          currentQueue: currentQueue || [],
          hourOfDay,
          dayOfWeek,
          position: currentPosition,
        });

        setEstimatedWaitTime(estimation.waitTime);
        setConfidenceLevel(estimation.confidence);
      } catch (error) {
        logger.error("Error calculating wait time estimation:", error);
        // Fallback to simple estimation
        setEstimatedWaitTime(15); // Default 15 minutes
        setConfidenceLevel("low");
      }
    },
    []
  );

  return {
    estimatedWaitTime,
    confidenceLevel,
    calculateEstimatedWaitTime,
  };
};

// Wait time calculation logic
function calculateWaitTimeEstimation({
  recentPatterns,
  currentQueue,
  hourOfDay,
  dayOfWeek,
  position,
}: {
  recentPatterns: any[];
  currentQueue: any[];
  hourOfDay: number;
  dayOfWeek: number;
  position?: number;
}): { waitTime: number; confidence: "high" | "medium" | "low" } {
  // Base estimation from historical data
  const historicalAvg =
    recentPatterns.length > 0
      ? recentPatterns.reduce((sum, p) => sum + p.avg_wait_time, 0) /
        recentPatterns.length
      : 15; // fallback

  // Adjust for current queue length
  const currentWaiting = currentQueue.filter(
    (t) => t.status === "waiting"
  ).length;
  const currentServing = currentQueue.filter(
    (t) => t.status === "serving"
  ).length;

  // Calculate average service time from recent data
  const avgServiceTime =
    recentPatterns.length > 0
      ? recentPatterns.reduce((sum, p) => sum + p.avg_service_time, 0) /
        recentPatterns.length
      : 5; // fallback

  // Estimate based on queue position and service time
  const queueBasedEstimate =
    (position || currentWaiting) * avgServiceTime +
    currentServing * avgServiceTime;

  // Weight historical vs current conditions
  const weightedEstimate = historicalAvg * 0.3 + queueBasedEstimate * 0.7;

  // Determine confidence level
  let confidence: "high" | "medium" | "low" = "medium";
  if (recentPatterns.length >= 14) {
    confidence = "high"; // 2+ weeks of data
  } else if (recentPatterns.length < 3) {
    confidence = "low"; // Less than 3 days of data
  }

  return {
    waitTime: Math.max(1, Math.round(weightedEstimate)),
    confidence,
  };
}
```

### Phase 5: Analytics Dashboard Enhancements

#### 5.1 New Historical Analytics Components

```typescript
// Component for historical trend analysis
export const HistoricalTrendsSection: React.FC = () => {
  const { analyticsData } = useAnalyticsData();
  const [trendPeriod, setTrendPeriod] = useState<"week" | "month" | "quarter">(
    "month"
  );

  return (
    <div className="analytics-card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Historical Trends
        </h2>
        <select
          value={trendPeriod}
          onChange={(e) => setTrendPeriod(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="week">Past Week</option>
          <option value="month">Past Month</option>
          <option value="quarter">Past Quarter</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wait Time Trends */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-4">
            Wait Time Trends
          </h3>
          <LineChart
            data={analyticsData?.waitTimeTrend || []}
            xKey="date"
            yKey="avgWaitTime"
            height={300}
            color="#3B82F6"
          />
        </div>

        {/* Volume Trends */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-4">
            Volume Trends
          </h3>
          <LineChart
            data={analyticsData?.volumeTrend || []}
            xKey="date"
            yKey="ticketCount"
            height={300}
            color="#10B981"
          />
        </div>
      </div>

      {/* Seasonal Patterns */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-700 mb-4">
          Peak Hours Heatmap
        </h3>
        <PeakHoursHeatmap data={analyticsData?.peakHoursPattern || []} />
      </div>
    </div>
  );
};

// Component for predictive analytics
export const PredictiveAnalyticsSection: React.FC = () => {
  const [predictions, setPredictions] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generatePredictions = useCallback(async () => {
    setLoading(true);
    try {
      // Call analytics API for predictions
      const response = await fetch("/api/analytics/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "wait_time_forecast",
          period: "next_week",
        }),
      });

      const data = await response.json();
      setPredictions(data);
    } catch (error) {
      logger.error("Error generating predictions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="analytics-card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Predictive Analytics
        </h2>
        <button
          onClick={generatePredictions}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Update Predictions"}
        </button>
      </div>

      {predictions && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Wait Time Forecast */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-4">
              Wait Time Forecast
            </h3>
            <div className="text-3xl font-bold text-blue-600">
              {predictions.avgWaitTimeForecast}min
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Expected average for next week
            </p>
          </div>

          {/* Volume Prediction */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-4">
              Volume Prediction
            </h3>
            <div className="text-3xl font-bold text-green-600">
              {predictions.volumeForecast}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Expected tickets next week
            </p>
          </div>

          {/* Peak Time Prediction */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-4">
              Peak Time Prediction
            </h3>
            <div className="text-3xl font-bold text-orange-600">
              {predictions.peakTimeForecast}
            </div>
            <p className="text-sm text-gray-500 mt-2">Expected busiest hour</p>
          </div>
        </div>
      )}
    </div>
  );
};
```

#### 5.2 Customer Wait Time Display Enhancement

```typescript
// Enhanced customer ticket creation with wait time estimation
export const EnhancedTicketCreation: React.FC = () => {
  const { estimatedWaitTime, confidenceLevel, calculateEstimatedWaitTime } =
    useWaitTimeEstimation();
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");

  useEffect(() => {
    if (selectedDepartment && selectedService) {
      calculateEstimatedWaitTime(selectedDepartment, selectedService);
    }
  }, [selectedDepartment, selectedService, calculateEstimatedWaitTime]);

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      {/* Department and Service Selection */}
      {/* ... existing selection UI ... */}

      {/* Wait Time Estimation Display */}
      {estimatedWaitTime > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-800">
                Estimated Wait Time
              </h3>
              <div className="flex items-center mt-2">
                <ClockIcon className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-2xl font-bold text-blue-600">
                  {estimatedWaitTime} min
                </span>
              </div>
            </div>
            <div className="text-right">
              <div
                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  confidenceLevel === "high"
                    ? "bg-green-100 text-green-800"
                    : confidenceLevel === "medium"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {confidenceLevel.toUpperCase()} CONFIDENCE
              </div>
            </div>
          </div>

          <p className="text-sm text-blue-600 mt-2">
            Based on historical data and current queue status
          </p>
        </div>
      )}

      {/* Create Ticket Button */}
      <button
        onClick={createTicket}
        className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        Create Ticket
      </button>
    </div>
  );
};
```

### Phase 6: Implementation Timeline & Testing

#### 6.1 Implementation Phases

#### **Phase 1: Database Schema (Week 1)**

- [ ] Create analytics tables with proper indexing
- [ ] Set up RLS policies
- [ ] Create data processing functions
- [ ] Test functions with sample data

#### **Phase 2: Edge Function Enhancement (Week 2)**

- [ ] Modify edge function to process analytics before cleanup
- [ ] Add comprehensive error handling
- [ ] Test edge function with analytics processing
- [ ] Deploy updated edge function

#### **Phase 3: Frontend Analytics Enhancement (Week 3)**

- [ ] Update analytics hooks to use historical data
- [ ] Create new analytics components
- [ ] Implement wait time estimation
- [ ] Enhanced customer-facing displays

#### **Phase 4: Testing & Optimization (Week 4)**

- [ ] Comprehensive testing with real data
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] User training and rollout

#### 6.2 Testing Strategy

#### **Database Testing**

```sql
-- Test data processing functions
SELECT process_daily_analytics('2025-08-24');
SELECT process_employee_analytics('2025-08-24');
SELECT process_service_analytics('2025-08-24');
SELECT process_notification_analytics('2025-08-24');

-- Verify data integrity
SELECT COUNT(*) FROM daily_analytics WHERE date = '2025-08-24';
SELECT * FROM daily_analytics WHERE avg_wait_time > 60; -- Check for anomalies
```

#### **Edge Function Testing**

```bash
# Test edge function with analytics processing
curl -X POST https://your-supabase-url/functions/v1/cleanup-database \
  -H "Authorization: Bearer your-key" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "adminKey": "cleanup-admin-2025"}'
```

#### **Frontend Testing**

- Test historical analytics display
- Verify wait time estimation accuracy
- Check responsive design across devices
- Validate real-time updates

#### 6.3 Success Metrics

#### **Technical Metrics**

- [ ] Analytics processing completes successfully before cleanup
- [ ] Database query performance remains optimal (<100ms for analytics queries)
- [ ] Edge function execution time increases by <30%
- [ ] Zero data loss during cleanup process

#### **Business Metrics**

- [ ] Wait time estimation accuracy >80%
- [ ] Historical trend analysis available for 6+ months
- [ ] Customer satisfaction improvement (if feedback is collected)
- [ ] Administrative decision-making enhancement

#### **Data Quality Metrics**

- [ ] 100% data consistency between live and historical tables
- [ ] Analytics processing error rate <1%
- [ ] Historical data completeness >95%
- [ ] Predictive model accuracy >75%

---

## Risk Assessment & Mitigation

### Technical Risks

#### **Risk 1: Analytics Processing Failure**

- _Impact_: High - Loss of historical data
- _Mitigation_: Implement comprehensive error handling, fallback mechanisms, and manual recovery procedures

#### **Risk 2: Database Performance Impact**

- _Impact_: Medium - Slower query performance
- _Mitigation_: Proper indexing, query optimization, and separate read replicas if needed

#### **Risk 3: Edge Function Timeout**

- _Impact_: Medium - Cleanup process failure
- _Mitigation_: Optimize processing functions, implement batching, and add timeout handling

### Data Risks

#### **Risk 1: Data Inconsistency**

- _Impact_: High - Inaccurate analytics
- _Mitigation_: Transactional processing, data validation, and reconciliation checks

#### **Risk 2: Storage Cost Increase**

- _Impact_: Low - Additional database costs
- _Mitigation_: Data compression, archival strategies, and cost monitoring

### Business Risks

#### **Risk 1: Inaccurate Wait Time Predictions**

- _Impact_: Medium - Poor customer experience
- _Mitigation_: Conservative estimates, confidence indicators, and continuous model improvement

#### **Risk 2: Implementation Complexity**

- _Impact_: Medium - Extended timeline
- _Mitigation_: Phased rollout, comprehensive testing, and gradual feature enablement

---

## Long-term Roadmap

### Phase 2 Enhancements (3-6 months)

#### **Advanced Predictive Analytics**

- Machine learning models for demand forecasting
- Seasonal pattern recognition
- Capacity optimization recommendations

#### **Customer Experience Features**

- SMS wait time updates
- Queue position notifications
- Estimated arrival time suggestions

#### **Administrative Features**

- Automated staffing recommendations
- Performance benchmarking across locations
- Custom analytics dashboards

### Phase 3 Enhancements (6-12 months)

#### **Business Intelligence Integration**

- Data export to BI tools
- Custom report generation
- Executive dashboard with KPIs

#### **Advanced Analytics**

- Customer journey analytics
- Service optimization insights
- Revenue impact analysis

#### **Integration Capabilities**

- API for third-party analytics tools
- Real-time data streaming
- Multi-tenant analytics platform

---

## Conclusion

This implementation plan provides a comprehensive approach to capturing, storing, and utilizing critical analytics information before data cleanup. The solution will enable accurate wait time estimation, detailed performance analysis, and data-driven operational improvements while maintaining system performance and data integrity.

**Key Benefits:**

- ✅ **Accurate Wait Time Estimation** - Historical data enables precise customer wait time predictions
- ✅ **Comprehensive Analytics** - Full historical data for trend analysis and performance optimization
- ✅ **Data-Driven Decisions** - Rich analytics for operational improvements and resource planning
- ✅ **Enhanced Customer Experience** - Better wait time communication and service expectations
- ✅ **Scalable Architecture** - Designed for growth with minimal performance impact

**Next Steps:**

1. **Review and Approve Plan** - Stakeholder review and technical validation
2. **Begin Phase 1 Implementation** - Database schema and function development
3. **Set up Development Environment** - Testing infrastructure and data migration
4. **Start Phased Rollout** - Gradual implementation with continuous monitoring

This plan ensures that critical analytics information is preserved and utilized effectively while maintaining the existing cleanup system's efficiency and reliability.
