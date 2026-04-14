import { createClient } from "@/lib/supabase/server";
import {
  AuditLog,
  AnalyticsResponse,
  Client,
  Expense,
  Income,
  PaymentStatus,
  Service,
  SummaryResponse,
  TableName,
  TableRow,
  User,
  Reimbursement,
} from "@/lib/types";

function toNumber(value: string | number | undefined): number {
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthLabel(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function groupSum<T>(items: T[], keyGetter: (item: T) => string, valueGetter: (item: T) => number) {
  const grouped = new Map<string, number>();
  for (const item of items) {
    const key = keyGetter(item);
    grouped.set(key, (grouped.get(key) ?? 0) + valueGetter(item));
  }
  return [...grouped.entries()].map(([label, amount]) => ({ label, amount }));
}

function groupSumNamed<T>(
  items: T[],
  keyGetter: (item: T) => string,
  valueGetter: (item: T) => number,
  keyName: string,
) {
  return groupSum(items, keyGetter, valueGetter).map((entry) => ({
    [keyName]: entry.label,
    amount: entry.amount,
  })) as Array<Record<string, string | number>>;
}

export async function listRows<T extends TableRow>(table: TableName): Promise<T[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
  if (error) {
    console.error(`Failed to list rows from ${table}:`, error);
    return [];
  }
  return (data as unknown) as T[];
}

export async function createRow<T extends TableRow>(table: TableName, payload: Record<string, unknown>): Promise<T> {
  const supabase = await createClient();
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) {
    throw new Error(`Failed to create row in ${table}: ${error.message}`);
  }
  return (data as unknown) as T;
}

export async function updateRow<T extends TableRow>(
  table: TableName,
  id: string,
  payload: Record<string, unknown>,
): Promise<T | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from(table).update(payload).eq("id", id).select().single();
  if (error) {
    console.error(`Failed to update row in ${table}:`, error);
    return null;
  }
  return (data as unknown) as T;
}

export async function deleteRow(table: TableName, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) {
    console.error(`Failed to delete row in ${table}:`, error);
    return false;
  }
  return true;
}

export async function getSummary(): Promise<SummaryResponse> {
  const income = await listRows<Income>("income");
  const rawExpenses = await listRows<Expense>("expenses");
  const reimbursements = await listRows<Reimbursement>("reimbursements");

  const approvedReimbursements: Expense[] = reimbursements
    .filter((r) => r.status === "approved")
    .map((r) => ({
      id: r.id,
      date: r.created_at,
      item: r.description,
      project: "Internal",
      paid_by: r.user_name,
      amount: r.amount,
      category: "Reimbursement",
      notes: "Employee Reimbursement",
      receipt_url: r.receipt_url,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

  const expenses = [...rawExpenses, ...approvedReimbursements];

  const totalIncome = income.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const advanceReceived = income
    .filter((row) => row.status === "Advance")
    .reduce((sum, row) => sum + toNumber(row.amount), 0);
  const pendingPayments = income
    .filter((row) => row.status === "To be paid")
    .reduce((sum, row) => sum + toNumber(row.amount), 0);
  const totalExpenses = expenses.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const profit = totalIncome - totalExpenses;

  const expensesByCategory = groupSum(expenses, (row) => row.category || "Uncategorized", (row) => toNumber(row.amount));
  const expensesByPerson = groupSum(expenses, (row) => row.paid_by || "Unknown", (row) => toNumber(row.amount));

  return {
    totalIncome,
    advanceReceived,
    pendingPayments,
    totalExpenses,
    profit,
    expensesByCategory,
    expensesByPerson,
  };
}

export async function getAnalytics(): Promise<AnalyticsResponse> {
  const income = await listRows<Income>("income");
  const rawExpenses = await listRows<Expense>("expenses");
  const reimbursements = await listRows<Reimbursement>("reimbursements");

  const approvedReimbursements: Expense[] = reimbursements
    .filter((r) => r.status === "approved")
    .map((r) => ({
      id: r.id,
      date: r.created_at,
      item: r.description,
      project: "Internal",
      paid_by: r.user_name,
      amount: r.amount,
      category: "Reimbursement",
      notes: "Employee Reimbursement",
      receipt_url: r.receipt_url,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

  const expenses = [...rawExpenses, ...approvedReimbursements];

  const monthlyIncomeMap = new Map<string, number>();
  const monthlyExpenseMap = new Map<string, number>();

  income.forEach((row) => {
    const month = monthLabel(row.date);
    monthlyIncomeMap.set(month, (monthlyIncomeMap.get(month) ?? 0) + toNumber(row.amount));
  });

  expenses.forEach((row) => {
    const month = monthLabel(row.date);
    monthlyExpenseMap.set(month, (monthlyExpenseMap.get(month) ?? 0) + toNumber(row.amount));
  });

  const monthlyIncome = [...monthlyIncomeMap.entries()]
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const monthlyExpenses = [...monthlyExpenseMap.entries()]
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const clientRevenue = groupSumNamed(income, (row) => row.client_name || "Unknown", (row) => toNumber(row.amount), "client") as Array<{
    client: string;
    amount: number;
  }>;

  const expenseCategory = groupSumNamed(
    expenses,
    (row) => row.category || "Uncategorized",
    (row) => toNumber(row.amount),
    "category",
  ) as Array<{ category: string; amount: number }>;

  return {
    monthlyIncome,
    monthlyExpenses,
    clientRevenue,
    expenseCategory,
  };
}

