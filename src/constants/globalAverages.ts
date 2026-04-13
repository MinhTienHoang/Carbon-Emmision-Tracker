// Tampa average carbon footprint data for digital activities
// Annual Tampa average baseline: 15.3 tons CO2e (15,300,000 grams per year)
// Values are in grams of CO2 equivalent

export interface GlobalAverageData {
  total: number; // Total daily CO2 in grams
  breakdown: {
    emails: number;
    streaming: number;
    coding: number;
    video_calls: number;
    cloud_storage: number;
    gaming: number;
    social_media: number;
  };
}


const TAMPA_ANNUAL_AVERAGE_TONS = 15.3;
const TAMPA_ANNUAL_AVERAGE_GRAMS = TAMPA_ANNUAL_AVERAGE_TONS * 1_000_000;
const TAMPA_DAILY_AVERAGE = Math.round(TAMPA_ANNUAL_AVERAGE_GRAMS / 365);
const TAMPA_WEEKLY_AVERAGE = Math.round(TAMPA_ANNUAL_AVERAGE_GRAMS / 52);
const TAMPA_MONTHLY_AVERAGE = Math.round(TAMPA_ANNUAL_AVERAGE_GRAMS / 12);
export const GLOBAL_AVERAGES = {
  daily: {
    total: TAMPA_DAILY_AVERAGE, // Tampa daily average from annual 15.3 tons
    breakdown: {
      emails: 5390,
      streaming: 14374,
      coding: 9583,
      video_calls: 7187,
      cloud_storage: 1797,
      gaming: 2995,
      social_media: 592,
    },
  },
  weekly: {
    total: TAMPA_WEEKLY_AVERAGE,
    breakdown: {
      emails: 37725,
      streaming: 100619,
      coding: 67079,
      video_calls: 50296,
      cloud_storage: 12574,
      gaming: 20957,
      social_media: 4190,
    },
  },
  monthly: {
    total: TAMPA_MONTHLY_AVERAGE,
    breakdown: {
      emails: 163929,
      streaming: 437144,
      coding: 291429,
      video_calls: 218572,
      cloud_storage: 54643,
      gaming: 91072,
      social_media: 18211,
    },
  },
} as const;

// Target goals (20% reduction from Tampa average)
export const TARGET_GOALS = {
  daily: {
    total: Math.round(GLOBAL_AVERAGES.daily.total * 0.8),
    breakdown: Object.fromEntries(
      Object.entries(GLOBAL_AVERAGES.daily.breakdown).map(([key, value]) => [
        key,
        Math.round(value * 0.8),
      ])
    ),
  },
  weekly: {
    total: Math.round(GLOBAL_AVERAGES.weekly.total * 0.8),
    breakdown: Object.fromEntries(
      Object.entries(GLOBAL_AVERAGES.weekly.breakdown).map(([key, value]) => [
        key,
        Math.round(value * 0.8),
      ])
    ),
  },
  monthly: {
    total: Math.round(GLOBAL_AVERAGES.monthly.total * 0.8),
    breakdown: Object.fromEntries(
      Object.entries(GLOBAL_AVERAGES.monthly.breakdown).map(([key, value]) => [
        key,
        Math.round(value * 0.8),
      ])
    ),
  },
} as const;

export type ComparisonPeriod = 'daily' | 'weekly' | 'monthly';

// Helper function to get comparison data for a specific period
export function getComparisonData(period: ComparisonPeriod) {
  return {
    average: GLOBAL_AVERAGES[period],
    target: TARGET_GOALS[period],
  };
}