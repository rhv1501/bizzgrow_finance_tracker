"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Role } from "@/lib/types";
import { fetchJson } from "@/lib/client-utils";
import { useGlobalFilter } from "@/components/GlobalFilterProvider";

type AppShellProps = {
  title: string;
  subtitle: string;
  role: Role;
  setRole: (role: Role) => void;
  children: React.ReactNode;
};

const navItems: { href: string; label: string; roles: Role[] }[] = [
  { href: "/", label: "Dashboard", roles: ["admin", "manager", "staff", "viewer"] },
  { href: "/income", label: "Income", roles: ["admin", "manager", "staff", "viewer"] },
  { href: "/expenses", label: "Expenses", roles: ["admin", "manager", "staff", "viewer", "employee"] },
  { href: "/analytics", label: "Analytics", roles: ["admin", "manager", "staff", "viewer"] },
  { href: "/admin", label: "Admin", roles: ["admin", "manager"] },
  { href: "/admin/reports", label: "Reports", roles: ["admin", "manager"] },
];

export function AppShell({
  title,
  subtitle,
  role,
  setRole,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const roleLabel = useMemo(() => role.toUpperCase(), [role]);

  async function logout() {
    setIsLoggingOut(true);
    try {
      await fetchJson("/api/auth/logout", { method: "POST" });
      setRole("viewer");
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  }

  const { month, year, setFilter } = useGlobalFilter();

  const months = [
    { value: 0, label: "All Months" },
    ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'short' }) }))
  ];

  const currentYear = new Date().getFullYear();
  const years = [0, currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7,#e0f2fe_35%,#f8fafc_70%)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs tracking-widest text-amber-700">
                FINANCE TRACKER PRO
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {title}
              </h1>
              <p className="text-sm text-slate-600">{subtitle}</p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
              <div className="flex gap-2 mr-4 text-sm">
                <select 
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-700 font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={month} 
                  onChange={(e) => setFilter({ month: Number(e.target.value), year })}
                >
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select 
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-700 font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={year} 
                  onChange={(e) => setFilter({ month, year: Number(e.target.value) })}
                >
                  <option value={0}>All Years</option>
                  {years.filter(y => y > 0).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                Current Role: {roleLabel}
              </span>
              <button
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                onClick={logout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
          <nav className="mt-4 flex flex-wrap gap-2">
            {navItems.filter(item => item.roles.includes(role)).map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
