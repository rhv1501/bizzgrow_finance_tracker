import { Role } from "@/lib/types";

export type Permission =
  | "read"
  | "createTransaction"
  | "updateTransaction"
  | "deleteTransaction"
  | "manageMasterData"
  | "manageUsers"
  | "downloadReports";

const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    "read",
    "createTransaction",
    "updateTransaction",
    "deleteTransaction",
    "manageMasterData",
    "manageUsers",
    "downloadReports",
  ],
  manager: [
    "read",
    "createTransaction",
    "updateTransaction",
    "deleteTransaction",
    "manageMasterData",
    "downloadReports",
  ],
  staff: ["read", "createTransaction", "updateTransaction"],
  viewer: ["read"],
  employee: ["read", "createTransaction"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}
