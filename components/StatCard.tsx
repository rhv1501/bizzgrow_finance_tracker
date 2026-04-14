import { formatCurrency } from "@/lib/client-utils";

type StatCardProps = {
  label: string;
  value: number;
  tone?: "positive" | "negative" | "neutral";
};

export function StatCard({ label, value, tone = "neutral" }: StatCardProps) {
  const toneClasses = {
    positive: "bg-emerald-50 border-emerald-600/40 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-100 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-all duration-300 shadow-emerald-500/5",
    negative: "bg-rose-50 border-rose-600/40 text-rose-950 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-100 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40 transition-all duration-300 shadow-rose-500/5",
    neutral: "bg-card border-slate-300 dark:border-border text-foreground group-hover:bg-muted/50 transition-all duration-300 shadow-sm",
  };

  const amountColor = {
    positive: "text-emerald-700 dark:text-emerald-400",
    negative: "text-rose-700 dark:text-rose-400",
    neutral: "text-foreground",
  };

  const labelColor = {
      positive: "text-emerald-950 dark:text-emerald-300",
      negative: "text-rose-950 dark:text-rose-300",
      neutral: "text-slate-900 dark:text-zinc-400",
  };

  return (
    <article className={`group relative overflow-hidden rounded-2xl border-2 p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${toneClasses[tone]}`}>
      <div className="flex flex-col gap-1.5 relative z-10">
        <p className={`text-xs font-black uppercase tracking-widest ${labelColor[tone]}`}>
          {label}
        </p>
        <p className={`text-2xl font-black tracking-tight ${amountColor[tone]}`}>
          {formatCurrency(value)}
        </p>
      </div>
      
      {/* Subtle indicator decoration */}
      <div className={`absolute -right-2 -top-2 h-16 w-16 rounded-full opacity-10 dark:opacity-20 transition-transform duration-700 group-hover:scale-150 ${
        tone === 'positive' ? 'bg-emerald-500' : tone === 'negative' ? 'bg-rose-500' : 'bg-primary'
      }`} />
    </article>
  );
}
