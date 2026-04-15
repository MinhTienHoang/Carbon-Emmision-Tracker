"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { formatCO2Amount } from "@/lib/calculations/carbonFootprint";
import { ComparisonPeriod, getComparisonData } from "@/constants/globalAverages";

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
  const effectiveAverage = averageFootprint ?? average.total;
  const effectiveTarget = targetFootprint ?? target.total;

  const chartData = useMemo(() => {
    const dataArray = [userFootprint, effectiveAverage, effectiveTarget];
    return {
      labels: ["Your Footprint", "Tampa Average", "Target Goal"],
      datasets: [
        {
          label: `${period.charAt(0).toUpperCase() + period.slice(1)} CO₂ Emissions`,
          data: dataArray,
          backgroundColor: [
            userFootprint <= effectiveTarget ? "#10B981" : "#EF4444", // Green if below target, red if above
            "#3B82F6", // Blue for Tampa average
            "#F59E0B", // Yellow for target
          ],
          borderColor: [
            userFootprint <= effectiveTarget ? "#059669" : "#DC2626",
            "#2563EB",
            "#D97706",
          ],
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    };
  }, [userFootprint, effectiveAverage, effectiveTarget, period]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false, // Hide legend since we have custom labels
        },
        title: {
          display: true,
          text: `${period.charAt(0).toUpperCase() + period.slice(1)} Carbon Footprint Comparison`,
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
            label: (context: any) => {
              const value = context.parsed.y;
              const label = context.label;
              
              let description = "";
              if (label === "Your Footprint") {
                const percentageVsTarget = ((value / effectiveTarget - 1) * 100).toFixed(1);
                description = value <= effectiveTarget
                  ? `🎉 ${Math.abs(Number(percentageVsTarget))}% below target!`
                  : `⚠️ ${percentageVsTarget}% above target`;
              } else if (label === "Tampa Average") {
                description = "Tampa annual average baseline (15.3 tons/year)";
              } else if (label === "Target Goal") {
                description = "20% reduction from Tampa average";
              }
              
              return [`${formatCO2Amount(value)}`, description];
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
              weight: "500" as const,
            },
          },
        },
      },
    };
  }, [period, effectiveTarget]);

  // Performance status
  const getPerformanceStatus = () => {
    if (userFootprint <= effectiveTarget) {
      return {
        status: "excellent",
        message: "🎉 Great job! You're below the target!",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
      };
    } else if (userFootprint <= effectiveAverage) {
      return {
        status: "good",
        message: "👍 You're below average, but there's room for improvement!",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
      };
    } else {
      return {
        status: "needs_improvement",
        message: "⚠️ Your footprint is above average. Small changes can make a big difference!",
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
      };
    }
  };

  const performanceStatus = getPerformanceStatus();

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      {/* Chart */}
      <div className="h-80 mb-6">
        <Bar data={chartData} options={chartOptions} redraw />
      </div>

      {/* Performance Status */}
      <div className={`p-4 rounded-lg border-2 ${performanceStatus.bgColor} ${performanceStatus.borderColor}`}>
        <p className={`font-semibold ${performanceStatus.color} mb-2`}>
          {performanceStatus.message}
        </p>
        
        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">vs Tampa Average:</span>
            <span className={`ml-2 font-semibold ${
              userFootprint <= effectiveAverage ? "text-green-600" : "text-red-600"
            }`}>
              {userFootprint <= effectiveAverage ? "-" : "+"}
              {Math.abs(((userFootprint / effectiveAverage - 1) * 100)).toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-gray-600">vs Target Goal:</span>
            <span className={`ml-2 font-semibold ${
              userFootprint <= effectiveTarget ? "text-green-600" : "text-red-600"
            }`}>
              {userFootprint <= effectiveTarget ? "-" : "+"}
              {Math.abs(((userFootprint / effectiveTarget - 1) * 100)).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}