"use client";

import { useMemo } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartData,
  ChartOptions,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  TooltipItem,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";
import { ACTIVITY_LABELS } from "@/constants/co2Factors";
import { formatCO2Amount } from "@/lib/calculations/carbonFootprint";
import { ActivityType } from "@/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
);

interface FootprintChartProps {
  type: "line" | "pie" | "bar";
  data: Record<string, number> | { labels: string[]; values: number[] };
  title: string;
  className?: string;
}

type SeriesData = { labels: string[]; values: number[] };
type BreakdownData = Record<string, number>;

const chartColors = [
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#6B7280",
];

export default function FootprintChart({
  type,
  data,
  title,
  className = "",
}: FootprintChartProps) {
  const isSeriesData = (
    value: FootprintChartProps["data"]
  ): value is SeriesData => {
    return (
      typeof value === "object" &&
      Array.isArray((value as SeriesData).labels) &&
      Array.isArray((value as SeriesData).values)
    );
  };

  const normalizedSeriesData = useMemo<SeriesData>(() => {
    if (!isSeriesData(data)) {
      return { labels: [], values: [] };
    }

    return {
      labels: data.labels ?? [],
      values: (data.values ?? []).map((value: number) =>
        Number.isFinite(value) ? value : 0
      ),
    };
  }, [data]);

  const normalizedBreakdown = useMemo<BreakdownData>(() => {
    if (isSeriesData(data)) {
      return {};
    }

    return Object.entries(data as BreakdownData).reduce<Record<string, number>>(
      (accumulator, [key, value]) => {
        accumulator[key] = Number.isFinite(value) ? value : 0;
        return accumulator;
      },
      {}
    );
  }, [data]);

  const filteredBreakdown = useMemo<BreakdownData>(() => {
    return Object.fromEntries(
      Object.entries(normalizedBreakdown).filter(([, value]) => value > 0)
    );
  }, [normalizedBreakdown]);

  const pieOptions = useMemo<ChartOptions<"pie">>(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
            },
          },
        },
        title: {
          display: true,
          text: title,
          font: {
            size: 16,
            weight: "bold" as const,
          },
          padding: 20,
        },
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<"pie">) => {
              const value = Number(context.parsed ?? 0);
              const datasetValues = (context.dataset.data as number[]) ?? [];
              const total = datasetValues.reduce(
                (sum: number, item: number) => sum + item,
                0
              );
              const percentage =
                total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";

              return `${context.label}: ${formatCO2Amount(
                value
              )} (${percentage}%)`;
            },
          },
        },
      },
    };
  }, [title]);

  const lineOptions = useMemo<ChartOptions<"line">>(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
            },
          },
        },
        title: {
          display: true,
          text: title,
          font: {
            size: 16,
            weight: "bold",
          },
          padding: 20,
        },
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<"line">) =>
              `Daily CO2 Emissions: ${formatCO2Amount(context.parsed.y ?? 0)}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: string | number) =>
              formatCO2Amount(Number(value)),
          },
        },
        x: {
          ticks: {
            maxTicksLimit: 7,
          },
        },
      },
    };
  }, [title]);

  const barOptions = useMemo<ChartOptions<"bar">>(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
            },
          },
        },
        title: {
          display: true,
          text: title,
          font: {
            size: 16,
            weight: "bold",
          },
          padding: 20,
        },
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<"bar">) =>
              `CO2 Emissions: ${formatCO2Amount(context.parsed.y ?? 0)}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: string | number) =>
              formatCO2Amount(Number(value)),
          },
        },
      },
    };
  }, [title]);

  const pieData = useMemo<ChartData<"pie", number[], string>>(() => {
    return {
      labels: Object.keys(filteredBreakdown).map(
        (key) => ACTIVITY_LABELS[key as ActivityType] || key
      ),
      datasets: [
        {
          label: "CO2 Emissions",
          data: Object.values(filteredBreakdown),
          backgroundColor: `${chartColors[0]}80`,
          borderColor: chartColors[0],
          borderWidth: 2,
          borderRadius: 4,
        },
      ],
    };
  }, [filteredBreakdown]);

  const lineData = useMemo<ChartData<"line", number[], string>>(() => {
    return {
      labels: normalizedSeriesData.labels,
      datasets: [
        {
          label: "Daily CO2 Emissions",
          data: normalizedSeriesData.values,
          borderColor: chartColors[0],
          backgroundColor: `${chartColors[0]}20`,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: chartColors[0],
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
        },
      ],
    };
  }, [normalizedSeriesData.labels, normalizedSeriesData.values]);

  const barData = useMemo<ChartData<"bar", number[], string>>(() => {
    return {
      labels: Object.keys(filteredBreakdown).map(
        (key) => ACTIVITY_LABELS[key as ActivityType] || key
      ),
      datasets: [
        {
          label: "CO2 Emissions",
          data: Object.values(filteredBreakdown),
          backgroundColor: `${chartColors[0]}80`,
          borderColor: chartColors[0],
          borderWidth: 2,
          borderRadius: 4,
        },
      ],
    };
  }, [filteredBreakdown]);

  const hasData = useMemo(() => {
    if (type === "line") {
      return (
        normalizedSeriesData.values.length > 0 &&
        normalizedSeriesData.values.some((value: number) => value > 0)
      );
    }

    return Object.keys(filteredBreakdown).length > 0;
  }, [filteredBreakdown, normalizedSeriesData.values, type]);

  if (!hasData) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="h-80 flex flex-col items-center justify-center">
          <div className="mb-4 text-5xl text-gray-300">+</div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900">{title}</h3>
          <p className="max-w-xs text-center text-gray-600">
            Add activities to generate chart data for this view.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="h-80">
        {type === "pie" && <Pie data={pieData} options={pieOptions} />}
        {type === "line" && <Line data={lineData} options={lineOptions} />}
        {type === "bar" && <Bar data={barData} options={barOptions} />}
      </div>
    </div>
  );
}
