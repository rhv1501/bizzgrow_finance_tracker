import { fail, ok, parseZodError } from "@/lib/api";
import { createExpenseSchema } from "@/lib/schemas";
import { createRow, listRows } from "@/lib/db";
import { requirePermission, getSessionFromRequest } from "@/lib/auth";
import { Expense, Role } from "@/lib/types";



export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const role = requirePermission(request, "read");
  if (role instanceof Response) {
    return role;
  }

  const rows = await listRows<Expense>("expenses");
  
  let data = rows;
  if (session.role === "employee") {
    data = rows.filter(row => row.paid_by === session.name && row.category === "Reimbursement");
  }

  return ok({ role: session.role, data, session });
}

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const role = requirePermission(request, "createTransaction");
  if (role instanceof Response) {
    return role;
  }

  try {
    const body = await request.json();
    const parsed = createExpenseSchema.parse(body);

    if (session.role === "employee") {
      parsed.category = "Reimbursement";
      parsed.paid_by = session.name;
    }

    const created = await createRow<Expense>("expenses", parsed);
    return ok({ role: session.role as Role, data: created }, 201);
  } catch (error) {
    return fail(parseZodError(error), 400);
  }
}
