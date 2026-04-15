"use client";

import { useState, useMemo } from "react";
import ComparisonChart from "@/components/charts/ComparisonChart";
import PeriodSelector from "@/components/ui/PeriodSelector";
import { ComparisonPeriod, getComparisonData } from "@/constants/globalAverages";
import { DashboardData } from "@/types";
import { formatCO2Amount } from "@/lib/calculations/carbonFootprint";

interface ComparisonSectionProps {
  dashboardData: DashboardData;
  className?: string;
}

export default function ComparisonSection({
  dashboardData,
  className = "",
}: ComparisonSectionProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<ComparisonPeriod>("daily");

  // Calculate user footprint for selected period
  const userFootprint = useMemo(() => {
    switch (selectedPeriod) {
      case "daily":
        return dashboardData?.todayFootprint ?? 0;
      case "weekly":
        return dashboardData?.weeklyFootprint ?? 0;
      case "monthly":
        return dashboardData?.monthlyFootprint ?? 0;
      default:
        return dashboardData?.todayFootprint ?? 0;
    }
  }, [selectedPeriod, dashboardData?.todayFootprint, dashboardData?.weeklyFootprint, dashboardData?.monthlyFootprint]);

  const { average, target } = getComparisonData(selectedPeriod);

  // Generate contextual tips based on performance
  const getContextualTips = () => {
    const isAboveTarget = userFootprint > target.total;
    const isAboveAverage = userFootprint > average.total;

    if (!isAboveTarget) {
      return [
        {
          icon: "🌟",
          title: "Keep up the great work!",
          description: "You're already below the target. Consider sharing your eco-friendly habits with others.",
        },
        {
          icon: "📈",
          title: "Set a new challenge",
          description: "Try reducing your footprint by another 10% to become a carbon champion.",
        },
      ];
    }

    if (isAboveAverage) {
      return [
        {
          icon: "💡",
          title: "Reduce streaming quality",
          description: "Lower video quality from 4K to 1080p can reduce emissions by up to 25%.",
        },
        {
          icon: "📧",
          title: "Clean up your inbox",
          description: "Delete old emails and unsubscribe from newsletters to reduce server storage needs.",
        },
        {
          icon: "☁️",
          title: "Optimize cloud storage",
          description: "Remove duplicate files and compress large documents to reduce cloud storage footprint.",
        },
      ];
    }

    return [
      {
        icon: "🎯",
        title: "You're close to the target!",
        description: "Small adjustments like shorter video calls can help you reach the goal.",
      },
      {
        icon: "⚡",
        title: "Enable power saving mode",
        description: "Use dark mode and reduce screen brightness to lower device energy consumption.",
      },
    ];
  };

  const tips = getContextualTips();

  // Calculate potential savings
  const potentialSavings = useMemo(() => {
    if (userFootprint <= target.total) return 0;
    return userFootprint - target.total;
  }, [userFootprint, target.total]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          How Do You Compare?
        </h2>
        <p className="text-gray-600">
          See how your carbon footprint stacks up against Tampa averages and targets
        </p>
      </div>

      {/* Period Selector */}
      <div className="flex justify-center">
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          className="w-full max-w-md"
        />
      </div>

      {/* Comparison Chart */}
      <ComparisonChart
        userFootprint={userFootprint}
        period={selectedPeriod}
      />

      {/* Impact Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">🌍</div>
          <div className="text-sm text-gray-600 mb-1">Tampa Average</div>
          <div className="text-xl font-bold text-blue-600">
            {formatCO2Amount(average.total)}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">🎯</div>
          <div className="text-sm text-gray-600 mb-1">Target Goal</div>
          <div className="text-xl font-bold text-yellow-600">
            {formatCO2Amount(target.total)}
          </div>
        </div>
        
        <div className={`rounded-lg p-4 text-center ${
          userFootprint <= target.total 
            ? "bg-gradient-to-br from-green-50 to-green-100" 
            : "bg-gradient-to-br from-red-50 to-red-100"
        }`}>
          <div className="text-2xl mb-2">
            {userFootprint <= target.total ? "🎉" : "⚠️"}
          </div>
          <div className="text-sm text-gray-600 mb-1">
            {potentialSavings > 0 ? "Potential Savings" : "You're on track!"}
          </div>
          <div className={`text-xl font-bold ${
            userFootprint <= target.total ? "text-green-600" : "text-red-600"
          }`}>
            {potentialSavings > 0 
              ? formatCO2Amount(potentialSavings)
              : "✓ Target achieved"
            }
          </div>
        </div>
      </div>

      {/* Contextual Tips */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
          💡 Personalized Tips for You
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {tips.map((tip, index) => (
            <div
              key={index}
              className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="text-2xl flex-shrink-0">{tip.icon}</div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">{tip.title}</h4>
                <p className="text-sm text-gray-600">{tip.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Educational Context */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
        <div className="text-center">
          <div className="text-3xl mb-3">🌱</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Why Comparison Matters
          </h3>
          <p className="text-gray-700 text-sm leading-relaxed max-w-2xl mx-auto">
            Understanding your carbon footprint in context helps you make informed decisions. 
            The Tampa average reflects a local annual baseline of 15.3 tons, while our target 
            goal reflects the 20% reduction scientists recommend to help combat climate change. 
            Every gram of CO₂ saved contributes to a healthier planet! 🌍
          </p>
        </div>
      </div>
    </div>
  );
}