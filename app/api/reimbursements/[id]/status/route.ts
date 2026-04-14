import { fail, ok, parseZodError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { updateRow, createRow, listRows } from "@/lib/db";
import { sendReimbursementStatusEmail } from "@/lib/mail";
import { Reimbursement, User, Expense } from "@/lib/types";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await requirePermission("manageReimbursements");
  if (role instanceof Response) return role;

  const { id } = await params;
  const { status } = await request.json();

  if (!["approved", "rejected"].includes(status)) {
    return fail("Invalid status. Must be approved or rejected.", 400);
  }

  try {
    // 1. Fetch current reimbursement to get metadata for expense and email
    const allReimbursements = await listRows<Reimbursement>("reimbursements");
    const item = allReimbursements.find(r => r.id === id);

    if (!item) {
      return fail("Reimbursement not found", 404);
    }

    if (item.status !== "pending") {
      return fail(`Cannot update status. Request is already ${item.status}.`, 400);
    }

    // 2. Update status
    const updated = await updateRow<Reimbursement>("reimbursements", id, { status });

    if (!updated) {
      throw new Error("Failed to update status in database");
    }

    // 3. If approved, sync to expenses
    if (status === "approved") {
      await createRow<Expense>("expenses", {
        date: item.date,
        item: item.description,
        project: item.project,
        paid_by: item.user_name,
        amount: item.amount,
        category: item.category,
        notes: `Reimbursement ID: ${item.id}`,
        receipt_url: item.receipt_url
      });
    }

    // 4. Notify Employee
    try {
      const allUsers = await listRows<User>("users");
      const employee = allUsers.find(u => u.id === item.user_id);
      
      if (employee?.email) {
        await sendReimbursementStatusEmail(
          employee.email,
          item.amount,
          status as "approved" | "rejected"
        );
      }
    } catch (mailError) {
      console.error("Failed to notify employee of status update:", mailError);
    }

    return ok({ data: updated });
  } catch (error) {
    return fail(parseZodError(error), 500);
  }
}
