import { google } from "googleapis";
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
} from "@/lib/types";
import { hashPassword } from "@/lib/security";
import { pusherServer } from "@/lib/pusher-server";

type RowValue = Record<string, string>;

type SheetConfig = {
  sheetName: string;
  headers: string[];
};

const sheetConfigs: Record<TableName, SheetConfig> = {
  clients: {
    sheetName: "Clients",
    headers: ["id", "name", "contact", "company", "created_at"],
  },
  services: {
    sheetName: "Services",
    headers: ["id", "name", "price", "created_at"],
  },
  users: {
    sheetName: "Users",
    headers: [
      "id",
      "name",
      "email",
      "password_hash",
      "must_change_password",
      "role",
      "created_at",
    ],
  },
  audit_logs: {
    sheetName: "AuditLogs",
    headers: [
      "id",
      "action",
      "actor_email",
      "actor_role",
      "target_user_id",
      "target_user_email",
      "details",
      "created_at",
    ],
  },
  income: {
    sheetName: "Income",
    headers: [
      "id",
      "client_id",
      "client_name",
      "service_id",
      "service_type",
      "amount",
      "status",
      "payment_method",
      "date",
      "notes",
      "created_at",
      "updated_at",
    ],
  },
  expenses: {
    sheetName: "Expenses",
    headers: [
      "id",
      "date",
      "item",
      "project",
      "paid_by",
      "amount",
      "category",
      "notes",
      "created_at",
      "updated_at",
    ],
  },
};

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const servicePrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
const useMockDb = process.env.MOCK_DB === "true" || !spreadsheetId || !serviceEmail || !servicePrivateKey;

function nowIso() {
  return new Date().toISOString();
}

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

let authClient: InstanceType<typeof google.auth.JWT> | null = null;

function getGoogleClient() {
  if (useMockDb) {
    throw new Error("Google Sheets credentials are missing. Set env vars or use MOCK_DB=true.");
  }

  if (!authClient) {
    authClient = new google.auth.JWT({
      email: serviceEmail,
      key: servicePrivateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }

  return google.sheets({ version: "v4", auth: authClient });
}

async function ensureSheetHeaders(table: TableName) {
  const sheets = getGoogleClient();
  const config = sheetConfigs[table];
  const headerRange = `${config.sheetName}!1:1`;

  let currentHeaders: string[] = [];
  try {
    const headerValues = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    });
    currentHeaders = headerValues.data.values?.[0] ?? [];
  } catch (error: any) {
    if (error?.code === 400) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: config.sheetName,
                },
              },
            },
          ],
        },
      });
    } else {
      throw error;
    }
  }

  const hasExpectedHeaders = config.headers.every((header, index) => currentHeaders[index] === header);

  if (!hasExpectedHeaders) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${config.sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [config.headers],
      },
    });
  }
}

async function listFromSheets(table: TableName): Promise<RowValue[]> {
  await ensureSheetHeaders(table);

  const sheets = getGoogleClient();
  const config = sheetConfigs[table];
  const range = `${config.sheetName}!A1:Z`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const values = response.data.values ?? [];
  if (values.length <= 1) {
    return [];
  }

  const headers = values[0];
  const dataRows = values.slice(1);

  return dataRows
    .filter((row) => row.length > 0 && row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => {
      const rowObj: RowValue = {};
      headers.forEach((header, index) => {
        rowObj[header] = String(row[index] ?? "");
      });

      return rowObj;
    });
}

function getNextId(rows: RowValue[]) {
  const maxId = rows.reduce((max, row) => {
    const idValue = Number(row.id ?? 0);
    return Number.isFinite(idValue) ? Math.max(max, idValue) : max;
  }, 0);

  return String(maxId + 1);
}

async function insertIntoSheets(table: TableName, payload: RowValue): Promise<RowValue> {
  await ensureSheetHeaders(table);

  const sheets = getGoogleClient();
  const config = sheetConfigs[table];
  const existingRows = await listFromSheets(table);
  const id = payload.id || crypto.randomUUID();
  const timestamp = nowIso();

  const row: RowValue = {
    ...payload,
    id,
    created_at: payload.created_at || timestamp,
    updated_at: payload.updated_at || timestamp,
  };

  const orderedValues = config.headers.map((header) => row[header] ?? "");

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${config.sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [orderedValues],
    },
  });

  pusherServer.trigger("private-financetracker", "sync-event", { table, action: "insert" }).catch(() => {});

  return row;
}

async function updateInSheets(table: TableName, id: string, payload: RowValue): Promise<RowValue | null> {
  await ensureSheetHeaders(table);

  const sheets = getGoogleClient();
  const config = sheetConfigs[table];
  const valuesResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${config.sheetName}!A1:Z`,
  });

  const values = valuesResponse.data.values ?? [];
  if (values.length <= 1) {
    return null;
  }

  const headers = values[0];
  const rowIndex = values.findIndex((row, index) => index > 0 && String(row[0]) === id);
  if (rowIndex === -1) {
    return null;
  }

  const existing: RowValue = {};
  headers.forEach((header, index) => {
    existing[header] = String(values[rowIndex][index] ?? "");
  });

  const updated: RowValue = {
    ...existing,
    ...payload,
    id,
    updated_at: nowIso(),
  };

  const orderedValues = config.headers.map((header) => updated[header] ?? "");

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${config.sheetName}!A${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [orderedValues],
    },
  });

  pusherServer.trigger("private-financetracker", "sync-event", { table, action: "update" }).catch(() => {});

  return updated;
}

async function deleteFromSheets(table: TableName, id: string): Promise<boolean> {
  await ensureSheetHeaders(table);

  const sheets = getGoogleClient();
  const config = sheetConfigs[table];

  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    ranges: [config.sheetName],
  });

  const sheetId = metadata.data.sheets?.find((s) => s.properties?.title === config.sheetName)?.properties?.sheetId;
  if (sheetId === undefined) {
    return false;
  }

  const valuesResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${config.sheetName}!A1:A`,
  });

  const rows = valuesResponse.data.values ?? [];
  const rowIndex = rows.findIndex((row, index) => index > 0 && String(row[0] ?? "") === id);
  if (rowIndex === -1) {
    return false;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });

  pusherServer.trigger("private-financetracker", "sync-event", { table, action: "delete" }).catch(() => {});

  return true;
}

type MockDb = {
  clients: Client[];
  services: Service[];
  users: User[];
  income: Income[];
  expenses: Expense[];
  audit_logs: AuditLog[];
};

const globalDb = globalThis as typeof globalThis & { __FT_MOCK_DB__?: MockDb };

function makeSeedData(): MockDb {
  const timestamp = nowIso();

  return {
    clients: [
      { id: "1", name: "Framex", contact: "", company: "Framex", created_at: timestamp },
      { id: "2", name: "Shvalk", contact: "", company: "Shvalk", created_at: timestamp },
      { id: "3", name: "Soul Garden Bristo", contact: "", company: "Soul Garden Bristo", created_at: timestamp },
    ],
    services: [
      { id: "1", name: "SMM", price: 0, created_at: timestamp },
      { id: "2", name: "Shoot", price: 0, created_at: timestamp },
      { id: "3", name: "Editing", price: 0, created_at: timestamp },
    ],
    users: [
      {
        id: "1",
        name: "Rudresh",
        email: "admin@bizzgrow.com",
        password_hash: hashPassword("Admin@123"),
        must_change_password: true,
        role: "admin",
        created_at: timestamp,
      },
      {
        id: "2",
        name: "Akash",
        email: "staff@bizzgrow.com",
        password_hash: hashPassword("Staff@123"),
        must_change_password: false,
        role: "staff",
        created_at: timestamp,
      },
    ],
    income: [
      {
        id: "1",
        client_id: "1",
        client_name: "Framex",
        service_id: "1",
        service_type: "SMM",
        amount: 7000,
        status: "Advance",
        payment_method: "Bank",
        date: "2026-02-10",
        notes: "",
        created_at: timestamp,
        updated_at: timestamp,
      },
      {
        id: "2",
        client_id: "3",
        client_name: "Soul Garden Bristo",
        service_id: "2",
        service_type: "Shoot",
        amount: 4000,
        status: "To be paid",
        payment_method: "",
        date: "2026-02-12",
        notes: "",
        created_at: timestamp,
        updated_at: timestamp,
      },
    ],
    expenses: [
      {
        id: "1",
        date: "2026-02-11",
        item: "Team Lunch",
        project: "Internal",
        paid_by: "Rudresh",
        amount: 1200,
        category: "Operations",
        notes: "",
        created_at: timestamp,
        updated_at: timestamp,
      },
      {
        id: "2",
        date: "2026-02-13",
        item: "Night food",
        project: "Internal",
        paid_by: "Akash",
        amount: 500,
        category: "Operations",
        notes: "",
        created_at: timestamp,
        updated_at: timestamp,
      },
      {
        id: "3",
        date: "2026-02-15",
        item: "Gimble",
        project: "Asset",
        paid_by: "Akash",
        amount: 13990,
        category: "Asset",
        notes: "",
        created_at: timestamp,
        updated_at: timestamp,
      },
    ],
    audit_logs: [],
  };
}

function getMockDb(): MockDb {
  if (!globalDb.__FT_MOCK_DB__) {
    globalDb.__FT_MOCK_DB__ = makeSeedData();
  }

  return globalDb.__FT_MOCK_DB__;
}

function normalizeIncome(row: RowValue): Income {
  return {
    id: row.id || "",
    client_id: row.client_id || "",
    client_name: row.client_name || "",
    service_id: row.service_id || "",
    service_type: row.service_type || "",
    amount: toNumber(row.amount),
    status: (row.status as PaymentStatus) || "To be paid",
    payment_method: row.payment_method || "",
    date: row.date || "",
    notes: row.notes || "",
    created_at: row.created_at || "",
    updated_at: row.updated_at || "",
  };
}

function normalizeExpense(row: RowValue): Expense {
  return {
    id: row.id || "",
    date: row.date || "",
    item: row.item || "",
    project: row.project || "",
    paid_by: row.paid_by || "",
    amount: toNumber(row.amount),
    category: row.category || "",
    notes: row.notes || "",
    created_at: row.created_at || "",
    updated_at: row.updated_at || "",
  };
}

function normalizeClient(row: RowValue): Client {
  return {
    id: row.id || "",
    name: row.name || "",
    contact: row.contact || "",
    company: row.company || "",
    created_at: row.created_at || "",
  };
}

function normalizeService(row: RowValue): Service {
  return {
    id: row.id || "",
    name: row.name || "",
    price: toNumber(row.price),
    created_at: row.created_at || "",
  };
}

function normalizeUser(row: RowValue): User {
  return {
    id: row.id || "",
    name: row.name || "",
    email: row.email || "",
    password_hash: row.password_hash || "",
    must_change_password: ["true", "1", "yes"].includes((row.must_change_password || "").toLowerCase()),
    role: (row.role as User["role"]) || "viewer",
    created_at: row.created_at || "",
  };
}

function normalizeAuditLog(row: RowValue): AuditLog {
  return {
    id: row.id || "",
    action: row.action || "",
    actor_email: row.actor_email || "",
    actor_role: (row.actor_role as AuditLog["actor_role"]) || "viewer",
    target_user_id: row.target_user_id || "",
    target_user_email: row.target_user_email || "",
    details: row.details || "",
    created_at: row.created_at || "",
  };
}

function normalizeByTable(table: TableName, row: RowValue): TableRow {
  switch (table) {
    case "income":
      return normalizeIncome(row);
    case "expenses":
      return normalizeExpense(row);
    case "clients":
      return normalizeClient(row);
    case "services":
      return normalizeService(row);
    case "users":
      return normalizeUser(row);
    case "audit_logs":
      return normalizeAuditLog(row);
    default:
      throw new Error(`Unsupported table: ${table}`);
  }
}

function toRowValue(input: Record<string, unknown>): RowValue {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, String(value ?? "")]));
}

export async function listRows<T extends TableRow>(table: TableName): Promise<T[]> {
  if (useMockDb) {
    const db = getMockDb();
    return [...db[table]] as T[];
  }

  const rows = await listFromSheets(table);
  return rows.map((row) => normalizeByTable(table, row) as T);
}

export async function createRow<T extends TableRow>(table: TableName, payload: Record<string, unknown>): Promise<T> {
  if (useMockDb) {
    const db = getMockDb();
    const list = db[table] as unknown as Array<Record<string, unknown>>;
    const nextId = payload.id ? String(payload.id) : crypto.randomUUID();
    const timestamp = nowIso();

    const created = {
      id: nextId,
      ...payload,
      created_at: timestamp,
      updated_at: timestamp,
    };

    list.push(created as never);
    return created as T;
  }

  const inserted = await insertIntoSheets(table, toRowValue(payload));
  return normalizeByTable(table, inserted) as T;
}

export async function updateRow<T extends TableRow>(
  table: TableName,
  id: string,
  payload: Record<string, unknown>,
): Promise<T | null> {
  if (useMockDb) {
    const db = getMockDb();
    const list = db[table] as unknown as Array<Record<string, unknown>>;
    const index = list.findIndex((row) => String(row.id) === id);
    if (index === -1) {
      return null;
    }

    list[index] = {
      ...list[index],
      ...payload,
      id,
      updated_at: nowIso(),
    };

    return list[index] as T;
  }

  const updated = await updateInSheets(table, id, toRowValue(payload));
  if (!updated) {
    return null;
  }

  return normalizeByTable(table, updated) as T;
}

export async function deleteRow(table: TableName, id: string): Promise<boolean> {
  if (useMockDb) {
    const db = getMockDb();
    const list = db[table] as unknown as Array<Record<string, unknown>>;
    const index = list.findIndex((row) => String(row.id) === id);
    if (index === -1) {
      return false;
    }

    list.splice(index, 1);
    return true;
  }

  return deleteFromSheets(table, id);
}

export async function getSummary(): Promise<SummaryResponse> {
  const income = await listRows<Income>("income");
  const expenses = await listRows<Expense>("expenses");

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
  const expenses = await listRows<Expense>("expenses");

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

export function isUsingMockDb() {
  return useMockDb;
}
