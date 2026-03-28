# Finance Tracker Pro

Comprehensive income and expense tracker for business operations using:

- Frontend: Next.js App Router + Tailwind CSS
- Backend: Next.js API Routes
- Database: Google Sheets (primary) with optional in-memory mock fallback
- Analytics: Chart.js + `react-chartjs-2`
- Access Control: Role-based permissions (`admin`, `manager`, `staff`, `viewer`)

## Core Modules

1. Dashboard (`/`)

- Total income
- Advance received
- Pending payments
- Total expenses
- Profit
- Expense charts by category and by person

2. Income (`/income`)

- Add income transactions
- Payment status tracking (`Advance`, `Paid`, `To be paid`)
- Client/service lookup

3. Expenses (`/expenses`)

- Add expense transactions
- Project and category tagging
- Team member spend visibility

4. Analytics (`/analytics`)

- Monthly income vs expense trends
- Client revenue chart
- Expense category mix
- Monthly CSV report download

5. Admin (`/admin`)

- Manage clients and services
- Manage users and roles (admin only)

## Data Model (Sheets)

The app uses these logical tables/sheets:

- `Clients`: `id`, `name`, `contact`, `company`, `created_at`
- `Services`: `id`, `name`, `price`, `created_at`
- `Users`: `id`, `name`, `email`, `password_hash`, `must_change_password`, `role`, `created_at`
- `Income`: `id`, `client_id`, `client_name`, `service_id`, `service_type`, `amount`, `status`, `payment_method`, `date`, `notes`, `created_at`, `updated_at`
- `Expenses`: `id`, `date`, `item`, `project`, `paid_by`, `amount`, `category`, `notes`, `created_at`, `updated_at`
- `AuditLogs`: `id`, `action`, `actor_email`, `actor_role`, `target_user_id`, `target_user_email`, `details`, `created_at`

## Role Permissions

- `admin`: full control, including user/role management
- `manager`: transactions + master data + report download
- `staff`: read + create/update transactions
- `viewer`: read-only

## Setup

1. Install dependencies

```bash
npm install
```

2. Configure environment variables

```bash
cp .env.example .env.local
```

Update `.env.local` with your Google Sheets values.

3. Share your sheet with service account email

- Open Google Sheet
- Click Share
- Add `GOOGLE_SERVICE_ACCOUNT_EMAIL` with Editor access

4. Create sheet tabs with exact names

- `Clients`
- `Services`
- `Users`
- `Income`
- `Expenses`
- `AuditLogs`

Headers are auto-managed by the app on first run.

5. Run app

```bash
npm run dev
```

Open `http://localhost:3000`.

## First Admin Login

If there are no credentialed users yet, the app bootstraps an admin account on first login:

- Email: `admin@bizzgrow.com`
- Password: `Admin@123`

You can override these with env vars in `.env.local`:

- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`

After logging in as admin, go to `/admin` and create users with custom or auto-generated credentials.

## Mock Mode

If Google credentials are not set, app automatically falls back to mock mode when `MOCK_DB=true` or missing credentials.

Use this for local UI development, then switch to Sheets for production.

## API Endpoints

- Auth
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `POST /api/auth/change-password`
- Dashboard
  - `GET /api/summary`
  - `GET /api/analytics`
- CRUD
  - `GET|POST /api/income`
  - `PUT|DELETE /api/income/:id`
  - `GET|POST /api/expenses`
  - `PUT|DELETE /api/expenses/:id`
  - `GET|POST /api/clients`
  - `PUT|DELETE /api/clients/:id`
  - `GET|POST /api/services`
  - `PUT|DELETE /api/services/:id`
  - `GET|POST /api/users`
  - `PUT|DELETE /api/users/:id`
  - `POST /api/users/:id/reset-password`
  - `GET /api/audit-logs`

## Smart Suggestions You Can Add Next

- Automated pending-payment reminders via WhatsApp/email integration
- File attachments for invoices and expense bills
- Per-project profitability analytics
- Approval workflow for large expenses
- GST/tax report export templates
- Audit logs for role-sensitive actions
