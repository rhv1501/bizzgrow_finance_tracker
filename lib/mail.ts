import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "BizzGrow Finance <finance@bizzgrowlabs.com>";

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: #1e293b;
  margin: 0;
  padding: 0;
  background-color: #f8fafc;
`;

const CONTAINER_STYLE = `
  max-width: 600px;
  margin: 40px auto;
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
`;

const HEADER_STYLE = `
  background: #0f172a;
  color: #ffffff;
  padding: 32px;
  text-align: center;
`;

const CONTENT_STYLE = `
  padding: 32px;
`;

const FOOTER_STYLE = `
  padding: 24px;
  text-align: center;
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
`;

const BUTTON_STYLE = `
  display: inline-block;
  padding: 12px 24px;
  background-color: #0f172a;
  color: #ffffff;
  text-decoration: none;
  border-radius: 8px;
  font-weight: bold;
  margin-top: 20px;
`;

function wrap(content: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="${BASE_STYLE}">
        <div style="${CONTAINER_STYLE}">
          <div style="${HEADER_STYLE}">
            <p style="margin: 0; font-family: monospace; font-size: 10px; letter-spacing: 2px; color: #fbbf24; text-transform: uppercase;">Finance Tracker Pro</p>
            <h1 style="margin: 8px 0 0 0; font-size: 24px; font-weight: 800;">BizzGrow</h1>
          </div>
          <div style="${CONTENT_STYLE}">
            ${content}
          </div>
          <div style="${FOOTER_STYLE}">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} BizzGrow Digital Transformation. All rights reserved.</p>
            <p style="margin: 4px 0 0 0;">Empowering businesses to scale sustainably.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendWelcomeEmail(to: string, name: string, credentials: { email: string, password: string }) {
  const html = wrap(`
    <h2 style="margin-top: 0; color: #0f172a;">Welcome to the Team, ${name}!</h2>
    <p>Your finance tracking account has been successfully created. You can now log in to manage your reimbursements and track business financials.</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #64748b;">Login Credentials:</p>
      <p style="margin: 8px 0 0 0;"><strong>Email:</strong> ${credentials.email}</p>
      <p style="margin: 4px 0 0 0;"><strong>Password:</strong> ${credentials.password}</p>
    </div>

    <p style="font-size: 14px; color: #64748b;">Note: You will be required to change your password upon your first login for security purposes.</p>

    <a href="https://finance.bizzgrowlabs.com/login" style="${BUTTON_STYLE}">Sign In to Dashboard</a>
  `);

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Welcome to BizzGrow Finance - Your Credentials",
    html,
  });
}

export async function sendReimbursementFiledEmail(to: string[], employeeName: string, amount: number, description: string) {
  const html = wrap(`
    <h2 style="margin-top: 0; color: #0f172a;">New Reimbursement Request</h2>
    <p>A new reimbursement request has been submitted and requires your review.</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0;"><strong>Employee:</strong> ${employeeName}</p>
      <p style="margin: 4px 0 0 0;"><strong>Amount:</strong> ₹${amount.toLocaleString()}</p>
      <p style="margin: 4px 0 0 0;"><strong>Description:</strong> ${description}</p>
    </div>

    <a href="https://finance.bizzgrowlabs.com/reimbursements" style="${BUTTON_STYLE}">Review Request</a>
  `);

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `New Reimbursement Request: ₹${amount.toLocaleString()} from ${employeeName}`,
    html,
  });
}

export async function sendReimbursementStatusEmail(to: string, amount: number, status: "approved" | "rejected") {
  const color = status === "approved" ? "#16a34a" : "#dc2626";
  const html = wrap(`
    <h2 style="margin-top: 0; color: #0f172a;">Reimbursement Update</h2>
    <p>There has been an update to your reimbursement request for <strong>₹${amount.toLocaleString()}</strong>.</p>
    
    <div style="text-align: center; padding: 24px; margin: 24px 0; border-radius: 12px; border: 2px solid ${color}; background: ${status === 'approved' ? '#f0fdf4' : '#fef2f2'};">
      <p style="margin: 0; font-size: 14px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Status</p>
      <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: 900; color: ${color}; text-transform: uppercase;">${status}</p>
    </div>

    <p>You can view the details and history in your dashboard.</p>

    <a href="https://finance.bizzgrowlabs.com/reimbursements" style="${BUTTON_STYLE}">View in Dashboard</a>
  `);

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Update: Your reimbursement has been ${status}`,
    html,
  });
}
