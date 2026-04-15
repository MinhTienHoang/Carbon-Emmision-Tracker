"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LinearScale,
  Title,
  Tooltip,
  TooltipItem,
} from "chart.js";
import { formatCO2Amount } from "@/lib/calculations/carbonFootprint";
import {
  ComparisonPeriod,
  getComparisonData,
} from "@/constants/globalAverages";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ComparisonChartProps {
  userFootprint: number;
  period: ComparisonPeriod;
  averageFootprint?: number;
  targetFootprint?: number;
  className?: string;
}

export default function ComparisonChart({
  userFootprint,
  period,
  averageFootprint,
  targetFootprint,
  className = "",
}: ComparisonChartProps) {
  const { average, target } = getComparisonData(period);
  const safeUserFootprint = Math.max(
    0,
    Number.isFinite(userFootprint) ? userFootprint : 0
  );
  const effectiveAverage = Math.max(0, averageFootprint ?? average.total);
  const effectiveTarget = Math.max(0, targetFootprint ?? target.total);

  const formatPercentageDelta = (baseline: number) => {
    if (baseline <= 0) {
      return "0.0%";
    }

    return `${Math.abs(((safeUserFootprint / baseline - 1) * 100)).toFixed(1)}%`;
  };

  const chartData = useMemo(() => {
    return {
      labels: ["Your Footprint", "Tampa Average", "Target Goal"],
      datasets: [
        {
          label: `${
            period.charAt(0).toUpperCase() + period.slice(1)
          } CO2 Emissions`,
          data: [safeUserFootprint, effectiveAverage, effectiveTarget],
          backgroundColor: [
            safeUserFootprint <= effectiveTarget ? "#10B981" : "#EF4444",
            "#3B82F6",
            "#F59E0B",
          ],
          borderColor: [
            safeUserFootprint <= effectiveTarget ? "#059669" : "#DC2626",
            "#2563EB",
            "#D97706",
          ],
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    };
  }, [effectiveAverage, effectiveTarget, period, safeUserFootprint]);

  const chartOptions = useMemo<ChartOptions<"bar">>(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: `${
            period.charAt(0).toUpperCase() + period.slice(1)
          } Carbon Footprint Comparison`,
          font: {
            size: 18,
            weight: "bold" as const,
          },
          padding: 20,
          color: "#1F2937",
        },
        tooltip: {
          backgroundColor: "#1F2937",
          titleColor: "#F9FAFB",
          bodyColor: "#F9FAFB",
          borderColor: "#374151",
          borderWidth: 1,
          cornerRadius: 8,
          callbacks: {
            label: (context: TooltipItem<"bar">) => {
              const value = context.parsed.y ?? 0;
              const label = context.label;

              let description = "";
              if (label === "Your Footprint") {
                if (effectiveTarget > 0) {
                  const percentageVsTarget = (
                    (value / effectiveTarget - 1) *
                    100
                  ).toFixed(1);
                  description =
                    value <= effectiveTarget
                      ? `${Math.abs(Number(percentageVsTarget))}% below target`
                      : `${percentageVsTarget}% above target`;
                }
              } else if (label === "Tampa Average") {
                description = "Tampa annual average baseline (15.3 tons/year)";
              } else if (label === "Target Goal") {
                description = "20% reduction from Tampa average";
              }

              return description
                ? [`${formatCO2Amount(value)}`, description]
                : [formatCO2Amount(value)];
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "#F3F4F6",
          },
          ticks: {
            callback: (value: string | number) => formatCO2Amount(Number(value)),
            color: "#6B7280",
            font: {
              size: 12,
            },
          },
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#374151",
            font: {
              size: 12,
              weight: 500,
            },
          },
        },
      },
    };
  }, [effectiveTarget, period]);

  const performanceStatus = useMemo(() => {
    if (safeUserFootprint <= effectiveTarget) {
      return {
        message: "Great job! You're below the target!",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
      };
    }

    if (safeUserFootprint <= effectiveAverage) {
      return {
        message: "You're below average, but there's room for improvement!",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
      };
    }

    return {
      message:
        "Your footprint is above average. Small changes can make a big difference!",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    };
  }, [effectiveAverage, effectiveTarget, safeUserFootprint]);

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="h-80 mb-6">
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div
        className={`rounded-lg border-2 p-4 ${performanceStatus.bgColor} ${performanceStatus.borderColor}`}
      >
        <p className={`mb-2 font-semibold ${performanceStatus.color}`}>
          {performanceStatus.message}
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">vs Tampa Average:</span>
            <span
              className={`ml-2 font-semibold ${
                safeUserFootprint <= effectiveAverage
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {safeUserFootprint <= effectiveAverage ? "-" : "+"}
              {formatPercentageDelta(effectiveAverage)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">vs Target Goal:</span>
            <span
              className={`ml-2 font-semibold ${
                safeUserFootprint <= effectiveTarget
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {safeUserFootprint <= effectiveTarget ? "-" : "+"}
              {formatPercentageDelta(effectiveTarget)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
