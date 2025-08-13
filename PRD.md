# Product Requirements Document (PRD) — Smart Queue System

## 1. Product Overview

The Smart Queue System is a cloud-based SaaS platform designed to manage and optimize customer queues for businesses such as banks, grocery stores, hospitals, and service centers. It enables customers to join queues digitally via QR codes, while providing real-time queue management tools for staff via a role-based admin dashboard.

This system will use Supabase for database and authentication, with no backend server — logic will be implemented on the frontend with direct Supabase API calls.

## 2. Objectives

Reduce customer wait times by allowing them to join queues remotely.

Provide real-time queue status updates and notifications via WhatsApp.

Allow organizations to manage multiple branches and departments.

Provide a multi-role admin dashboard for different levels of control.

Generate QR codes that direct customers to the appropriate branded customer app with pre-configured organization data.

## 3. Target Users

Business Owners (Admins)

Branch Managers

Department Employees

Customers

## 4. Key Features

### 4.1 Customer App

No authentication required.

Accessible via QR code link (contains organization_key and optional branch_key).

Customer selects branch and department.

Customer enters phone number to join queue.

WhatsApp notifications for:

Queue ticket confirmation (e.g., C039).

Notification when 3 customers away from service.

Notification when it’s their turn.

### 4.2 Admin Dashboard

Role-based access control:

Admin:

Create and manage organization profile, branches, and departments.

Invite members via email.

Assign roles to members (Admin, Manager, Employee).

Assign members to branches/departments.

Generate QR codes for organization and branches.

View and call next ticket number for any branch/department.

Manager:

Assigned to one branch.

Create and manage departments within their branch.

View and call next ticket number for their branch.

Employee:

Assigned to one department.

View and call next ticket number in their department only.

### 4.3 QR Code System

QR code encodes URL containing organization/branch key.

URL opens customer app preloaded with relevant data.

### 4.4 Queue Management

Call next ticket number.

Update current serving ticket.

Display queue stats: customers waiting, average wait time.

### 4.5 Notifications

Integrated with WhatsApp via API (e.g., UltraMsg, Twilio).

Send real-time queue updates.

## 5. Technical Requirements

Database: Supabase (PostgreSQL)

Authentication: Supabase Auth (email/password, magic link)

Hosting: Vercel for both Admin Dashboard and Customer App

WhatsApp API: UltraMsg or Twilio

QR Code Generation: JavaScript library (qrcode or similar)

Frontend Framework: React + Next.js

Styling: Tailwind CSS

## 6. Success Metrics

Average wait time reduction.

Increased number of customers served per hour.

High customer satisfaction scores (CSAT).

Low queue abandonment rates.
