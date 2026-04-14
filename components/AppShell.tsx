import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Role } from "@/lib/types";
import { fetchJson } from "@/lib/client-utils";
import { useSession } from "@/components/SessionProvider";
import { useGlobalFilter } from "@/components/GlobalFilterProvider";

type AppShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const navItems: { href: string; label: string; roles: Role[] }[] = [
  { href: "/", label: "Dashboard", roles: ["admin", "manager"] },
  { href: "/income", label: "Income", roles: ["admin", "manager"] },
  { href: "/expenses", label: "Expenses", roles: ["admin", "manager"] },
  { href: "/analytics", label: "Analytics", roles: ["admin", "manager"] },
  { href: "/admin", label: "Admin", roles: ["admin"] },
  { href: "/admin/reports", label: "Reports", roles: ["admin", "manager"] },
  { href: "/reimbursements", label: "Reimbursements", roles: ["admin", "manager", "employee"] },
];

export function AppShell({
  title,
  subtitle,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, loading: isLoadingSession, refresh: refreshSession } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const roleLabel = useMemo(() => role.toUpperCase(), [role]);

  // Close menu on navigation
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  async function logout() {
    setIsLoggingOut(true);
    try {
      await fetchJson("/api/auth/logout", { method: "POST" });
      await refreshSession();
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7,#e0f2fe_35%,#f8fafc_70%)] text-slate-900 lg:flex">
      
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Mobile Sidebar / Desktop Sidenav (Optional, but user said "move tabs to sidebar in mobile") */}
      {/* I will implement a slide-out drawer for mobile and keep the desktop header tabs for now as per plan */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white p-6 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-amber-700">
              FINANCE TRACKER PRO
            </p>
            <h2 className="text-xl font-bold">Navigation</h2>
          </div>
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          {navItems.filter(item => item.roles.includes(role)).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  active
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="rounded-2xl bg-amber-50 p-4 border border-amber-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Account Role</p>
            <p className="mt-1 text-sm font-bold text-amber-900">{roleLabel}</p>
          </div>
        </div>
      </aside>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Hamburger Button */}
              <button 
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 lg:hidden hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => setIsMenuOpen(true)}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-amber-700">
                  FINANCE TRACKER PRO
                </p>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
              </div>
            </div>

            <div className="hidden flex-col items-end gap-3 sm:flex lg:flex-row lg:items-center">
              <div className="flex gap-2 text-sm">
                <select 
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 font-bold hover:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                  value={month} 
                  onChange={(e) => setFilter({ month: Number(e.target.value), year })}
                >
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select 
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 font-bold hover:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                  value={year} 
                  onChange={(e) => setFilter({ month, year: Number(e.target.value) })}
                >
                  <option value={0}>All Years</option>
                  {years.filter(y => y > 0).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden lg:inline-flex rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-900 border border-amber-200">
                  {roleLabel}
                </span>
                <button
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 shadow-sm active:scale-95"
                  onClick={logout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="mt-6 hidden lg:flex flex-wrap gap-2">
            {isLoadingSession ? (
              <>
                <div className="h-10 w-24 rounded-xl bg-slate-100 animate-pulse"></div>
                <div className="h-10 w-24 rounded-xl bg-slate-100 animate-pulse"></div>
                <div className="h-10 w-28 rounded-xl bg-slate-100 animate-pulse"></div>
                <div className="h-10 w-20 rounded-xl bg-slate-100 animate-pulse"></div>
              </>
            ) : (
              navItems.filter(item => item.roles.includes(role)).map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 ${
                      active
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 translate-y-[-1px]"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })
            )}
          </nav>
          
          {/* Mobile Footer for Header Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-3 sm:hidden pt-4 border-t border-slate-100">
              <select 
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                value={month} 
                onChange={(e) => setFilter({ month: Number(e.target.value), year })}
              >
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700"
                onClick={logout}
                disabled={isLoggingOut}
              >
                Sign out
              </button>
          </div>
        </header>
        
        <main className="focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
