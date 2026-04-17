export type Role = "admin" | "manager" | "employee";

export type PaymentStatus = "Advance" | "Paid" | "To be paid";

export interface Client {
  id: string;
  name: string;
  contact: string;
  company: string;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  must_change_password?: boolean;
  role: Role;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actor_email: string;
  actor_role: Role;
  target_user_id: string;
  target_user_email: string;
  details: string;
  created_at: string;
}

export interface Income {
  id: string;
  client_id: string;
  client_name: string;
  service_id: string;
  service_type: string;
  amount: number;
  status: PaymentStatus;
  payment_method: string;
  date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  date: string;
  item: string;
  project: string;
  paid_by: string;
  amount: number;
  category: string;
  notes: string;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PeriodStats {
  revenue: number;
  expenses: number;
  profit: number;
}

export interface SummaryResponse {
  totalIncome: number;
  advanceReceived: number;
  pendingPayments: number;
  totalExpenses: number;
  profit: number;
  thisWeek: PeriodStats;
  thisMonth: PeriodStats;
  thisYear: PeriodStats;
  lifetime: PeriodStats;
  expensesByCategory: Array<{ label: string; amount: number }>;
  expensesByPerson: Array<{ label: string; amount: number }>;
}

export interface AnalyticsResponse {
  monthlyIncome: Array<{ month: string; amount: number }>;
  monthlyExpenses: Array<{ month: string; amount: number }>;
  clientRevenue: Array<{ client: string; amount: number }>;
  expenseCategory: Array<{ category: string; amount: number }>;
}

export type TableName = "clients" | "services" | "users" | "income" | "expenses" | "audit_logs" | "reimbursements";

export type TableRow = Client | Service | User | Income | Expense | AuditLog | Reimbursement;

export interface Reimbursement {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  description: string;
  project: string;
  category: string;
  date: string;
  receipt_url?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}
