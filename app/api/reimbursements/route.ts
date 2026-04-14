import { fail, ok, parseZodError } from "@/lib/api";
import { getSession, requirePermission } from "@/lib/auth";
import { createRow, listRows } from "@/lib/db";
import { sendReimbursementFiledEmail } from "@/lib/mail";
import { Reimbursement, User } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return fail("Authentication required", 401);
  }

  try {
    const body = await request.json();
    const created = await createRow<Reimbursement>("reimbursements", {
      user_id: session.userId,
      user_name: session.name,
      amount: body.amount,
      description: body.description,
      date: body.date,
      project: body.project,
      category: body.category,
      receipt_url: body.receipt_url,
      status: "pending",
    });

    // Notify Admins and Managers
    try {
      const allUsers = await listRows<User>("users");
      const financeEmails = allUsers
        .filter(u => u.role === "admin" || u.role === "manager")
        .map(u => u.email)
        .filter(Boolean);

      if (financeEmails.length > 0) {
        await sendReimbursementFiledEmail(
          financeEmails,
          session.name,
          created.amount,
          created.description
        );
      }
    } catch (mailError) {
      console.error("Failed to notify admins of new reimbursement:", mailError);
    }

    return ok({ data: created }, 201);
  } catch (error) {
    return fail(parseZodError(error), 400);
  }
}
