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
import { Bar, Line } from "react-chartjs-2";
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

interface PieSlice {
  key: string;
  label: string;
  value: number;
  color: string;
  percentage: number;
  strokeDasharray: string;
  strokeDashoffset: number;
}

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

  const pieSlices = useMemo<PieSlice[]>(() => {
    const entries = Object.entries(filteredBreakdown);
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    const circumference = 2 * Math.PI * 42;
    let cumulativeLength = 0;

    return entries.map(([key, value], index) => {
      const segmentLength = total > 0 ? (value / total) * circumference : 0;
      const slice: PieSlice = {
        key,
        label: ACTIVITY_LABELS[key as ActivityType] || key,
        value,
        color: chartColors[index % chartColors.length],
        percentage: total > 0 ? (value / total) * 100 : 0,
        strokeDasharray: `${segmentLength} ${circumference - segmentLength}`,
        strokeDashoffset: -cumulativeLength,
      };

      cumulativeLength += segmentLength;
      return slice;
    });
  }, [filteredBreakdown]);

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
        {type === "pie" && (
          <div className="flex h-full flex-col justify-center gap-4 md:flex-row md:items-center md:gap-6">
            <div className="relative mx-auto h-48 w-48 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="14"
                />
                {pieSlices.map((slice) => (
                  <circle
                    key={slice.key}
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={slice.color}
                    strokeWidth="14"
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    strokeLinecap="butt"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
                  Total
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCO2Amount(
                    pieSlices.reduce((sum, slice) => sum + slice.value, 0)
                  )}
                </span>
              </div>
            </div>

            <div className="grid flex-1 gap-3">
              {pieSlices.map((slice) => (
                <div
                  key={slice.key}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {slice.label}
                      </p>
                      <p className="text-xs text-gray-500">
                        {slice.percentage.toFixed(1)}% of weekly emissions
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-700">
                    {formatCO2Amount(slice.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {type === "line" && <Line data={lineData} options={lineOptions} />}
        {type === "bar" && <Bar data={barData} options={barOptions} />}
      </div>
    </div>
  );
}
