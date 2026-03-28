"use client";

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

export function ExpenseBreakdownCharts({
  byCategory,
  byPerson,
}: {
  byCategory: SeriesItem[];
  byPerson: SeriesItem[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-base font-semibold">Expenses by Category</h3>
        <Doughnut
          data={{
            labels: byCategory.map((item) => item.label),
            datasets: [
              {
                label: "Amount",
                data: byCategory.map((item) => item.amount),
                backgroundColor: [
                  "#fb7185",
                  "#f97316",
                  "#eab308",
                  "#14b8a6",
                  "#3b82f6",
                  "#8b5cf6",
                ],
                borderWidth: 1,
              },
            ],
          }}
        />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-base font-semibold">Expenses by Person</h3>
        <Bar
          data={{
            labels: byPerson.map((item) => item.label),
            datasets: [
              {
                label: "Amount",
                data: byPerson.map((item) => item.amount),
                backgroundColor: "#f97316",
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: {
              legend: { display: false },
            },
          }}
        />
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
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-base font-semibold">
          Monthly Income vs Expense
        </h3>
        <Line
          data={{
            labels: Array.from(
              new Set([
                ...monthlyIncome.map((x) => x.month),
                ...monthlyExpenses.map((x) => x.month),
              ]),
            ).sort(),
            datasets: [
              {
                label: "Income",
                data: Array.from(
                  new Set([
                    ...monthlyIncome.map((x) => x.month),
                    ...monthlyExpenses.map((x) => x.month),
                  ]),
                )
                  .sort()
                  .map(
                    (month) =>
                      monthlyIncome.find((entry) => entry.month === month)
                        ?.amount ?? 0,
                  ),
                borderColor: "#16a34a",
                backgroundColor: "rgba(22, 163, 74, 0.15)",
                tension: 0.3,
              },
              {
                label: "Expenses",
                data: Array.from(
                  new Set([
                    ...monthlyIncome.map((x) => x.month),
                    ...monthlyExpenses.map((x) => x.month),
                  ]),
                )
                  .sort()
                  .map(
                    (month) =>
                      monthlyExpenses.find((entry) => entry.month === month)
                        ?.amount ?? 0,
                  ),
                borderColor: "#dc2626",
                backgroundColor: "rgba(220, 38, 38, 0.15)",
                tension: 0.3,
              },
            ],
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-base font-semibold">Client Revenue</h3>
          <Bar
            data={{
              labels: clientRevenue.map((row) => row.client),
              datasets: [
                {
                  label: "Revenue",
                  data: clientRevenue.map((row) => row.amount),
                  backgroundColor: "#16a34a",
                },
              ],
            }}
            options={{ plugins: { legend: { display: false } } }}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-base font-semibold">Expense Category Mix</h3>
          <Doughnut
            data={{
              labels: expenseCategory.map((row) => row.category),
              datasets: [
                {
                  data: expenseCategory.map((row) => row.amount),
                  backgroundColor: [
                    "#0ea5e9",
                    "#f97316",
                    "#22c55e",
                    "#e11d48",
                    "#7c3aed",
                  ],
                },
              ],
            }}
          />
        </div>
      </div>
    </div>
  );
}
