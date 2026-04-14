import { Role } from "@/lib/types";

export type Permission =
  | "readCore"
  | "manageCore"
  | "manageMasterData"
  | "manageUsers"
  | "downloadReports"
  | "manageReimbursements"
  | "createReimbursement";

const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    "readCore",
    "manageCore",
    "manageMasterData",
    "manageUsers",
    "downloadReports",
    "manageReimbursements",
    "createReimbursement"
  ],
  manager: [
    "readCore",
    "manageCore",
    "manageMasterData",
    "downloadReports",
    "manageReimbursements",
    "createReimbursement"
  ],
  employee: [
    "createReimbursement"
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}
