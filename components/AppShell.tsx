import { useMemo, useState, useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";
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
    <div className="min-h-screen bg-background text-foreground lg:flex transition-colors duration-300">
      
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Mobile Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-card border-r border-border p-6 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-primary">
              FINANCE TRACKER PRO
            </p>
            <h2 className="text-xl font-bold">Navigation</h2>
          </div>
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="rounded-lg p-2 hover:bg-muted"
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
                    ? "bg-foreground text-background shadow-lg shadow-foreground/10"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="rounded-2xl bg-muted p-4 border border-border">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Account Role</p>
            <p className="mt-1 text-sm font-bold text-foreground">{roleLabel}</p>
          </div>
        </div>
      </aside>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl border border-border bg-card/70 backdrop-blur-2xl p-5 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all ring-1 ring-white/20">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Hamburger Button */}
              <button 
                className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground lg:hidden hover:bg-muted hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(true)}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-primary">
                  FINANCE TRACKER PRO
                </p>
                <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-1 text-sm font-medium text-muted-foreground">{subtitle}</p>
              </div>
            </div>

            <div className="hidden flex-col items-end gap-3 sm:flex lg:flex-row lg:items-center">
              <div className="flex gap-2 text-sm">
                <select 
                  className="rounded-xl border border-border bg-card px-3 py-2 text-foreground font-bold hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                  value={month} 
                  onChange={(e) => setFilter({ month: Number(e.target.value), year })}
                >
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select 
                  className="rounded-xl border border-border bg-card px-3 py-2 text-foreground font-bold hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                  value={year} 
                  onChange={(e) => setFilter({ month, year: Number(e.target.value) })}
                >
                  <option value={0}>All Years</option>
                  {years.filter(y => y > 0).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden lg:inline-flex rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary border border-primary/20">
                  {roleLabel}
                </span>
                <ThemeToggle />
                <button
                  className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground hover:bg-muted hover:border-border/50 transition-all disabled:opacity-50 shadow-sm active:scale-95"
                  onClick={logout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? "..." : "Sign out"}
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="mt-6 hidden lg:flex flex-wrap gap-2">
            {isLoadingSession ? (
              <>
                <div className="h-10 w-24 rounded-xl bg-muted animate-pulse"></div>
                <div className="h-10 w-24 rounded-xl bg-muted animate-pulse"></div>
                <div className="h-10 w-28 rounded-xl bg-muted animate-pulse"></div>
                <div className="h-10 w-20 rounded-xl bg-muted animate-pulse"></div>
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
                        ? "bg-foreground text-background shadow-lg shadow-foreground/10 translate-y-[-1px]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })
            )}
          </nav>
          
          {/* Mobile Footer for Header Actions */}
          <div className="mt-4 flex items-center justify-between sm:hidden pt-4 border-t border-border">
              <div className="flex gap-2">
                <select 
                    className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold"
                    value={month} 
                    onChange={(e) => setFilter({ month: Number(e.target.value), year })}
                >
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                    className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground"
                    onClick={logout}
                    disabled={isLoggingOut}
                >
                    Sign out
                </button>
              </div>
          </div>
        </header>
        
        <main className="focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
