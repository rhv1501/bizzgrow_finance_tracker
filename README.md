# Finance Tracker Pro

Comprehensive business income and expense tracker for BizzGrow, fully migrated to Supabase for high performance and real-time updates.

## Technology Stack

- **Frontend**: Next.js 16 (App Router) + Tailwind CSS v4
- **State Management**: React Context (Global session and filters)
- **Backend / Database**: Supabase (PostgreSQL + Auth + Storage)
- **Real-time**: Supabase Postgres Changes
- **Analytics**: Chart.js + `react-chartjs-2`

## Core Modules

1. **Dashboard** (`/`): Real-time summary of total income, advance, pending payments, expenses, and net profit. Includes visual breakdown charts.
2. **Income Tracker** (`/income`): Manage client revenue, payment status, and custom service entries. Real-time updates across all tabs.
3. **Expense Tracker** (`/expenses`): Log operational and project costs with support for receipt attachments (Supabase Storage).
4. **Analytics** (`/analytics`): Visualize historical performance trends, client revenue contribution, and expense categorization.
5. **Admin Panel** (`/admin`): Manage master data (Clients/Services) and Team Member accounts.
6. **Reports** (`/admin/reports`): Generate detailed Profit & Loss statements and chronological journals with CSV export.
7. **Reimbursements** (`/reimbursements`): Dedicated employee portal for submitting out-of-pocket expenses.

## Role-Based Access Control (RBAC)

The application enforces strict permissions via Supabase Row-Level Security (RLS) and middleware:

- **Admin**: Full control over all system data, user management, and audit logs.
- **Manager**: Access to all financial trackers and reports, but cannot manage users.
- **Employee**: Restricted to the Reimbursements portal only. No visibility into company-level revenue or overall dashboard stats.

## Setup & Deployment

1. **Prerequisites**: Node.js 20+, Supabase account.
2. **Setup Supabase**: Run the migrations in `/supabase/migrations` to set up tables, roles, and RLS policies.
3. **Environment Variables**: Configure `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   SUPABASE_SERVICE_ROLE_KEY=your_role_key
   ```
4. **Install & Run**:
   ```bash
   npm install
   npm run dev
   ```

## Key Architectural Highlights

- **Persistent Layouts**: Optimized `AppShell` with global `SessionProvider` ensures zero flickering between page transitions.
- **Real-time Engine**: Changes made in one tab (e.g., adding an income entry) are reflected instantly across all other active sessions via Supabase.
- **Security First**: Every API call and database query is validated against user roles using server-side session checks and database policies.

---
Built with ❤️ for BizzGrow Digital Transformation.
