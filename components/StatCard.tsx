import { formatCurrency } from "@/lib/client-utils";

type StatCardProps = {
  label: string;
  value: number;
  tone?: "positive" | "negative" | "neutral";
};

export function StatCard({ label, value, tone = "neutral" }: StatCardProps) {
  const toneClasses = {
    positive: "bg-emerald-50/50 border-emerald-200 text-emerald-900 group-hover:bg-emerald-100/50 transition-colors duration-300",
    negative: "bg-rose-50/50 border-rose-200 text-rose-900 group-hover:bg-rose-100/50 transition-colors duration-300",
    neutral: "bg-slate-50/50 border-slate-200 text-slate-900 group-hover:bg-slate-100/50 transition-colors duration-300",
  };

  const amountColor = {
    positive: "text-emerald-700",
    negative: "text-rose-700",
    neutral: "text-slate-900",
  };

  return (
    <article className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${toneClasses[tone]}`}>
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500/80">
          {label}
        </p>
        <p className={`text-2xl font-black tracking-tight ${amountColor[tone]}`}>
          {formatCurrency(value)}
        </p>
      </div>
      
      {/* Subtle indicator decoration */}
      <div className={`absolute -right-2 -top-2 h-12 w-12 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150 ${
        tone === 'positive' ? 'bg-emerald-500' : tone === 'negative' ? 'bg-rose-500' : 'bg-slate-500'
      }`} />
    </article>
  );
}
