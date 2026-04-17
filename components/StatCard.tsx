import { formatCurrency } from "@/lib/client-utils";

type StatCardProps = {
  label: string;
  value: number;
  tone?: "positive" | "negative" | "neutral";
};

export function StatCard({ label, value, tone = "neutral" }: StatCardProps) {
  const toneGlow = {
    positive: "bg-emerald-500/10 dark:bg-emerald-500/5",
    negative: "bg-rose-500/10 dark:bg-rose-500/5",
    neutral: "bg-primary/5",
  };

  const amountColor = {
    positive: "text-emerald-700 dark:text-emerald-400",
    negative: "text-rose-700 dark:text-rose-400",
    neutral: "text-foreground",
  };

  const labelColor = {
    positive: "text-emerald-800/70 dark:text-emerald-300/60",
    negative: "text-rose-800/70 dark:text-rose-300/60",
    neutral: "text-muted-foreground",
  };

  return (
    <article className={`group relative overflow-hidden rounded-2xl glass-card p-5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 ${toneGlow[tone]}`}>
      <div className="flex flex-col gap-1.5 relative z-10">
        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${labelColor[tone]}`}>
          {label}
        </p>
        <p className={`text-2xl font-black tracking-tighter ${amountColor[tone]}`}>
          {formatCurrency(value)}
        </p>
      </div>
      
      {/* Dynamic Glow Ornament */}
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl opacity-5 transition-transform duration-700 group-hover:scale-150 ${
        tone === 'positive' ? 'bg-emerald-500' : tone === 'negative' ? 'bg-rose-500' : 'bg-primary'
      }`} />
    </article>
  );
}
