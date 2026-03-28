import { formatCurrency } from "@/lib/client-utils";

type StatCardProps = {
  label: string;
  value: number;
  tone?: "positive" | "negative" | "neutral";
};

export function StatCard({ label, value, tone = "neutral" }: StatCardProps) {
  const toneClass =
    tone === "positive"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "negative"
        ? "border-rose-200 bg-rose-50"
        : "border-slate-200 bg-white";

  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">
        {formatCurrency(value)}
      </p>
    </article>
  );
}
