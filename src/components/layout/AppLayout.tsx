"use client";


import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuthDev";
import Navigation from "./Navigation";
import Dashboard from "@/components/dashboard/Dashboard";
import ActivityForm from "@/components/forms/ActivityForm";
import TipsPanel from "@/components/tips/TipsPanel";
import GoalsPanel from "@/components/gamification/GoalsPanel";
import BadgeDisplay from "@/components/gamification/BadgeDisplay";
import {
  ActivityHistoryEntry,
  ActivityInput,
  ActivityType,
  DashboardData,
  WeeklyGoal,
} from "@/types";
import {
  calculateEquivalents,
} from "@/lib/calculations/carbonFootprint";
import {
  getUserActivityHistory,
  saveActivityHistoryEntry,
  saveCarbonFootprint,
  saveActivity,
} from "@/lib/storage/localData";
import { ShortcutsModal } from "../ui/ShortcutsModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import QuickActionsFAB from "@/components/ui/QuickActionsFAB";


type PageType = "dashboard" | "activities" | "tips" | "goals" | "badges";
type SortOption = "newest" | "oldest" | "highest_impact" | "lowest_impact"; 

const LOCAL_STORAGE_KEY = "activitySortPreference";
const GOAL_STORAGE_KEY = "weeklyGoalTargetReduction";
const ACTIVITY_TYPE_MAP: Record<keyof ActivityInput, ActivityType> = {
  emails: "emails",
  streamingHours: "streaming",
  codingHours: "coding",
  videoCallHours: "video_calls",
  cloudStorageGB: "cloud_storage",
  gamingHours: "gaming",
  socialMediaHours: "social_media",
};

const getTimestampValue = (timestamp: Date | string | undefined) => {
  const date = new Date(timestamp ?? Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const getStartOfWeek = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  const day = normalized.getDay();
  const daysSinceMonday = (day + 6) % 7;
  normalized.setDate(normalized.getDate() - daysSinceMonday);
  return normalized;
};

const getStartOfDay = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const createDashboardFallback = (todayFootprint = 0) => ({
  todayFootprint,
  weeklyFootprint: todayFootprint,
  monthlyFootprint: todayFootprint,
  weeklyBreakdown: {
    emails: 0,
    streaming: 0,
    coding: 0,
    video_calls: 0,
    cloud_storage: 0,
    gaming: 0,
    social_media: 0,
  },
  trend: Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));

    return {
      date: date.toLocaleDateString("en-US", { weekday: "short" }),
      co2: index === 6 ? todayFootprint : 0,
    };
  }),
  equivalents: calculateEquivalents(todayFootprint),
});

const calculateTodayTotal = (entries: ActivityHistoryEntry[]) => {
  const today = getStartOfDay(new Date()).getTime();
  return entries
    .filter(
      (entry) => getStartOfDay(getTimestampValue(entry.timestamp)).getTime() === today
    )
    .reduce((sum, entry) => sum + entry.result.totalCO2, 0);
};

export default function AppLayout() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard");
  const [todayFootprint, setTodayFootprint] = useState(0);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [activityHistory, setActivityHistory] = useState<ActivityHistoryEntry[]>([]);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [sortPreference, setSortPreference] = useState<SortOption>("newest");
  const [goalTargetReduction, setGoalTargetReduction] = useState<number>(20);

  //keyboard hook
useKeyboardShortcuts({setCurrentPage});

// Dynamic page title based on current page
useEffect(() => {
  const pageTitles: Record<PageType, string> = {
    dashboard: "Dashboard | Carbon Tracker",
    activities: "Log Activities | Carbon Tracker",
    tips: "Eco Tips | Carbon Tracker",
    goals: "Goals | Carbon Tracker",
    badges: "Achievements | Carbon Tracker",
  };

  document.title = pageTitles[currentPage];
}, [currentPage]);

useEffect(() => {
  if (!user) return;

  const savedSort = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (savedSort && ['newest', 'oldest', 'highest_impact', 'lowest_impact'].includes(savedSort)) {
    setSortPreference(savedSort as SortOption);
  }

  const savedGoal = localStorage.getItem(GOAL_STORAGE_KEY);
  if (savedGoal) {
    const parsedGoal = Number(savedGoal);
    if (!Number.isNaN(parsedGoal) && parsedGoal > 0 && parsedGoal <= 100) {
      setGoalTargetReduction(parsedGoal);
    }
  }

  void loadUserDashboardState(user.id);
}, [user]);

  const handleSortChange = (newSort: SortOption) => {
    setSortPreference(newSort);
    localStorage.setItem(LOCAL_STORAGE_KEY, newSort);
  };

  const memoizedSortedHistory = useMemo(() => {
    // We create a shallow copy to ensure we don't mutate the original state.
    const sortedList = [...activityHistory];

    switch (sortPreference) {
      case "newest":
        // Sort descending by timestamp.
        return sortedList.sort(
          (a, b) =>
            getTimestampValue(b.timestamp).getTime() -
            getTimestampValue(a.timestamp).getTime()
        );
      case "oldest":
        // Sort ascending by timestamp.
        return sortedList.sort(
          (a, b) =>
            getTimestampValue(a.timestamp).getTime() -
            getTimestampValue(b.timestamp).getTime()
        );
      case "highest_impact":
        // Impact is based on totalCO2, so sort descending.
        return sortedList.sort((a, b) => b.result.totalCO2 - a.result.totalCO2);
      case "lowest_impact":
        // Impact is based on totalCO2, so sort ascending.
        return sortedList.sort((a, b) => a.result.totalCO2 - b.result.totalCO2);
      default:
        return sortedList.sort(
          (a, b) =>
            getTimestampValue(b.timestamp).getTime() -
            getTimestampValue(a.timestamp).getTime()
        );
    }
  }, [activityHistory, sortPreference]);

  const currentWeekCO2 = useMemo(() => {
    const currentWeekStart = getStartOfWeek(new Date());
    return activityHistory
      .filter((entry) => getTimestampValue(entry.timestamp) >= currentWeekStart)
      .reduce((sum, entry) => sum + entry.result.totalCO2, 0);
  }, [activityHistory]);

  const lastWeekCO2 = useMemo(() => {
    const currentWeekStart = getStartOfWeek(new Date());
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    return activityHistory
      .filter((entry) => {
        const timestamp = getTimestampValue(entry.timestamp);
        return timestamp >= lastWeekStart && timestamp < currentWeekStart;
      })
      .reduce((sum, entry) => sum + entry.result.totalCO2, 0);
  }, [activityHistory]);

  const currentGoal = useMemo<WeeklyGoal | undefined>(() => {
    if (!user) return undefined;

    const startDate = getStartOfWeek(new Date());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    const currentProgress =
      lastWeekCO2 > 0
        ? Math.max(0, ((lastWeekCO2 - currentWeekCO2) / lastWeekCO2) * 100)
        : 0;

    return {
      id: "local-weekly-goal",
      userId: user.id,
      targetReduction: goalTargetReduction,
      startDate,
      endDate,
      currentProgress,
      achieved: currentProgress >= goalTargetReduction,
    };
  }, [user, goalTargetReduction, currentWeekCO2, lastWeekCO2]);

  const loadUserDashboardState = async (userId: string) => {
    const savedHistory = await getUserActivityHistory(userId);
    setActivityHistory(savedHistory);

    const todayTotal = calculateTodayTotal(savedHistory);
    setTodayFootprint(todayTotal);
    setDashboardData(createDashboardFallback(todayTotal));
  };

  const handleActivitySubmit = async (
    activities: ActivityInput,
    result: {
      totalCO2: number;
      breakdown: Record<string, number>;
      equivalents: Array<{ description: string; value: number; unit: string }>;
    },
    customToastMessage?: string
  ) => {
    if (!user) return;

    setIsLoading(true);

    const timestamp = new Date();
    const historyEntry: ActivityHistoryEntry = {
      activities,
      result,
      timestamp,
      id: timestamp.getTime().toString(),
    };

    try {
      // Optimized: Update UI immediately for better UX
      const newTodayFootprint = todayFootprint + result.totalCO2;
      setTodayFootprint(newTodayFootprint);
      setDashboardData(createDashboardFallback(newTodayFootprint));

      // Add to activity history
      setActivityHistory((prev) => [...prev, historyEntry]);

      setCurrentPage("dashboard");

      // In development mode, simulate saving with shorter delay
      if (process.env.NODE_ENV === "development") {
        await saveActivityHistoryEntry(user.id, historyEntry);
        await new Promise((resolve) => setTimeout(resolve, 800)); // Faster development save
        console.log("Demo: Activities saved successfully", {
          activities,
          result,
        });
        setSuccessToast(customToastMessage || "Activities saved successfully!");
        setTimeout(() => setSuccessToast(null), 3000);
        return;
      }

      // Production: Batch all database operations
      const savePromises: Promise<void>[] = [];

      // Save activities in parallel
      (Object.entries(activities) as Array<[keyof ActivityInput, number]>).forEach(
        ([activityType, value]) => {
        if (value > 0) {
          savePromises.push(
            saveActivity({
              type: ACTIVITY_TYPE_MAP[activityType],
              value,
              date: timestamp,
              userId: user.id,
            })
          );
        }
      });

      // Save carbon footprint
      savePromises.push(
        saveCarbonFootprint({
          totalCO2: result.totalCO2,
          breakdown: result.breakdown,
          date: timestamp,
          userId: user.id,
        })
      );

      // Execute all saves in parallel
      await Promise.all(savePromises);
      await saveActivityHistoryEntry(user.id, historyEntry);
      setSuccessToast(customToastMessage || "Activities saved successfully!");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (error) {
      console.error("Error saving activities:", error);
      // Rollback UI changes on error
      setTodayFootprint((prev) => prev - result.totalCO2);
      setDashboardData((prev) =>
        prev ? createDashboardFallback(Math.max(0, prev.todayFootprint - result.totalCO2)) : prev
      );
      setActivityHistory((prev) => prev.filter((entry) => entry.id !== historyEntry.id));
      alert("Failed to save activities. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetGoal = async (targetReduction: number) => {
    if (!user) return;

    try {
      // This would save the goal to the database
      console.log("Setting goal:", targetReduction);
      setGoalTargetReduction(targetReduction);
      localStorage.setItem(GOAL_STORAGE_KEY, String(targetReduction));

      // For now, just show success
      setSuccessToast(`Goal set! Target: ${targetReduction}% reduction`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (error) {
      console.error("Error setting goal:", error);
      throw error;
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <Dashboard
            dashboardData={dashboardData}
            activityHistory={memoizedSortedHistory}
            sortPreference={sortPreference}
            onSortChange={handleSortChange}
            goalTargetReduction={goalTargetReduction}
            onNavigate={setCurrentPage}
          />
        );

      case "activities":
        return (
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 py-8">
            <div className="max-w-4xl mx-auto px-4">
              <ActivityForm
                onSubmit={handleActivitySubmit}
                initialValues={{}}
              />
            </div>
          </div>
        );

      case "tips":
        return (
          <div className=" bg-gradient-to-br from-green-50 to-emerald-100 py-8">
            <div className="max-w-6xl mx-auto px-4">
              <TipsPanel
                userFootprint={{
                  emails: 200,
                  streaming: 150,
                  coding: 100,
                  video_calls: 300,
                  cloud_storage: 25,
                  gaming: 180,
                  social_media: 80,
                }}
              />
            </div>
          </div>
        );

      case "goals":
        return (
          <div className=" min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
            <div className="max-w-4xl mx-auto px-4">
              <GoalsPanel
                currentGoal={currentGoal}
                currentWeekCO2={currentWeekCO2}
                lastWeekCO2={lastWeekCO2}
                onSetGoal={handleSetGoal}
              />
            </div>
          </div>
        );

      case "badges":
        return (
          <div className="  bg-gradient-to-br from-purple-50 to-pink-100 py-8">
            <div className="max-w-6xl mx-auto px-4">
              <BadgeDisplay
                userBadges={[
                  {
                    id: "first-steps",
                    name: "First Steps",
                    description: "Completed your first day of tracking",
                    icon: "👶",
                    requirement: {
                      type: "milestone",
                      threshold: 1,
                    },
                    achieved: true,
                    achievedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                  },
                  {
                    id: "eco-warrior",
                    name: "Eco Warrior",
                    description: "Reduced weekly footprint by 25%",
                    icon: "🌿",
                    requirement: {
                      type: "total_reduction",
                      threshold: 25,
                      period: "weekly",
                    },
                    achieved: true,
                    achievedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                  },
                ]}
                showAll={true}
              />
            </div>
          </div>
        );

      default:
        return (<Dashboard
          dashboardData={dashboardData}
          activityHistory={activityHistory}
          sortPreference={sortPreference}
          onSortChange={handleSortChange}
          goalTargetReduction={goalTargetReduction}
          onNavigate={setCurrentPage}
        />);
    }
  };

  if (!user) {
    return null; // This should be handled by the parent component
  }

  return (
    

    <div className="min-h-screen bg-gray-50">
      <Navigation
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        todayFootprint={todayFootprint}
      />

      <main className="lg:ml-64">{renderCurrentPage()}</main>

      {/* Optimized Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 text-center shadow-2xl">
            <div className="spinner-eco w-10 h-10 mx-auto mb-3"></div>
            <p className="text-gray-700 font-medium">Saving activities...</p>
            <div className="mt-2 w-32 h-1 bg-gray-200 rounded-full mx-auto">
              <div
                className="h-1 bg-green-500 rounded-full animate-pulse"
                style={{ width: "70%" }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successToast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
          <div className="flex items-center space-x-2">
            <span className="text-lg">✅</span>
            <span className="font-medium">{successToast}</span>
          </div>
        </div>
      )}

      {/* Mobile spacing for bottom navigation */}
      <div className="h-16 lg:hidden"></div>

      <QuickActionsFAB onSubmit={handleActivitySubmit} />

      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
      <button
        onClick={() => setShowShortcutsModal(true)}
        className="fixed bottom-4 right-4 bg-[#489d63] text-white p-3 rounded-full shadow-lg hover:bg-[#e3fdee] transition cursor-pointer z-30"
        aria-label="Keyboard shortcuts"
      >
        ⌨️
      </button>
    </div>
  );
}
