"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
);

type SeriesItem = { label: string; amount: number };
type MonthlyItem = { month: string; amount: number };

const CHART_COLORS = [
  "#fbbf24", // Amber (Primary)
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#f43f5e", // Rose
  "#8b5cf6", // Violet
  "#f97316", // Orange
];

export function ExpenseBreakdownCharts({
  byCategory,
  byPerson,
}: {
  byCategory: SeriesItem[];
  byPerson: SeriesItem[];
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)";
  const textColor = isDark ? "#a1a1aa" : "#64748b";

  const barOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor } },
      y: { grid: { color: gridColor }, ticks: { color: textColor } },
    },
  };

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 min-w-0">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm min-w-0 overflow-hidden">
        <h3 className="mb-4 text-base font-bold text-foreground">Expenses by Category</h3>
        <div className="h-64 flex justify-center relative">
            <Doughnut
            data={{
                labels: byCategory.map((item) => item.label),
                datasets: [
                {
                    label: "Amount",
                    data: byCategory.map((item) => item.amount),
                    backgroundColor: CHART_COLORS,
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? "#121215" : "#ffffff",
                },
                ],
            }}
            options={{
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom' as const,
                        labels: { color: textColor, padding: 20, usePointStyle: true, font: { size: 10, weight: 'bold' as const } }
                    }
                }
            }}
            />
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm min-w-0 overflow-hidden">
        <h3 className="mb-4 text-base font-bold text-foreground">Expenses by Person</h3>
        <div className="h-64 relative">
            <Bar
            data={{
                labels: byPerson.map((item) => item.label),
                datasets: [
                {
                    label: "Amount",
                    data: byPerson.map((item) => item.amount),
                    backgroundColor: "#fbbf24",
                    borderRadius: 8,
                },
                ],
            }}
            options={{ ...barOptions, maintainAspectRatio: false }}
            />
        </div>
      </div>
    </div>
  );
}

export function TrendCharts({
  monthlyIncome,
  monthlyExpenses,
  clientRevenue,
  expenseCategory,
}: {
  monthlyIncome: MonthlyItem[];
  monthlyExpenses: MonthlyItem[];
  clientRevenue: Array<{ client: string; amount: number }>;
  expenseCategory: Array<{ category: string; amount: number }>;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)";
  const textColor = isDark ? "#a1a1aa" : "#64748b";

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: textColor, usePointStyle: true, font: { size: 11, weight: 'bold' as const } }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor } },
      y: { grid: { color: gridColor }, ticks: { color: textColor } },
    },
  };

  const labels = Array.from(
    new Set([
      ...(monthlyIncome || []).map((x) => x.month),
      ...(monthlyExpenses || []).map((x) => x.month),
    ]),
  ).sort();

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-6 text-base font-bold text-foreground flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Monthly Income vs Expense
        </h3>
        <div className="h-80">
            <Line
            data={{
                labels,
                datasets: [
                {
                    label: "Income",
                    data: labels.map(m => (monthlyIncome || []).find(e => e.month === m)?.amount ?? 0),
                    borderColor: "#10b981",
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                },
                {
                    label: "Expenses",
                    data: labels.map(m => (monthlyExpenses || []).find(e => e.month === m)?.amount ?? 0),
                    borderColor: "#f43f5e",
                    backgroundColor: "rgba(244, 63, 94, 0.1)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                },
                ],
            }}
            options={chartOptions}
            />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 min-w-0">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm min-w-0 overflow-hidden">
          <h3 className="mb-4 text-base font-bold text-foreground">Client Revenue</h3>
          <div className="h-64 relative">
            <Bar
                data={{
                labels: (clientRevenue || []).map((row) => row.client),
                datasets: [
                    {
                    label: "Revenue",
                    data: (clientRevenue || []).map((row) => row.amount),
                    backgroundColor: "#10b981",
                    borderRadius: 6,
                    },
                ],
                }}
                options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm min-w-0 overflow-hidden text-center">
          <h3 className="mb-4 text-base font-bold text-foreground">Expense Mix</h3>
          <div className="h-64 flex justify-center relative">
            <Doughnut
                data={{
                labels: (expenseCategory || []).map((row) => row.category),
                datasets: [
                    {
                    data: (expenseCategory || []).map((row) => row.amount),
                    backgroundColor: CHART_COLORS,
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? "#121215" : "#ffffff",
                    },
                ],
                }}
                options={{
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: (typeof window !== 'undefined' && window.innerWidth < 768) ? 'bottom' as const : 'right' as const,
                            labels: { 
                                color: textColor, 
                                padding: 15, 
                                usePointStyle: true, 
                                font: { size: 10, weight: 'bold' as const } 
                            }
                        }
                    }
                }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
