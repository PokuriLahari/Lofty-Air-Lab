export type SmogSeverity = 'moderate' | 'sensitive' | 'severe' | 'hazardous';

export type FamilyMode = 'all' | 'children' | 'adults' | 'elderly';

export type RoomFilterCategory = 'all' | 'bedroom' | 'living' | 'kitchen' | 'hallway';

export type HouseholdType = 'family_kids' | 'multigen_seniors' | 'couple_solo' | 'shared_house';

export type HeatingSource = 'gas_furnace' | 'wood_coal' | 'electric_heat_pump' | 'drafty_apartment';

export type CommuteMode = 'gas_car' | 'public_transit' | 'bike_walk' | 'remote_home';

export type VerdictPerson = 'adult' | 'child' | 'elderly' | 'asthma';

export type VerdictActivity = 'walk' | 'run' | 'outdoor_work' | 'errands';

export type SafetyVerdict = 'Good to go' | 'Go easy' | 'Stay in';

export type AqiCategoryLabel = 'Good' | 'Moderate' | 'Poor' | 'Unhealthy' | 'Severe';

export type ChatLanguage = 'en' | 'hi' | 'te';

export type PlanTabId = 'daily-plan' | 'indoor-wellness' | 'sustainable-living' | 'ask-chatbot';

export interface CleanestWindowInfo {
  windowLabel: string;
  startHour: string;
  endHour: string;
  avgPm25: number | null;
  note: string;
}

export interface CitySuggestion {
  name: string;
  admin1?: string;
  country?: string;
  lat: number;
  lng: number;
  label: string;
}

export interface AirPlannerInput {
  location: string;
  smogSeverity: SmogSeverity;
  familyMode?: FamilyMode;
  household: HouseholdType;
  heating: HeatingSource;
  commute: CommuteMode;
  notes: string;
}

export interface RoutineStep {
  id: string;
  period: 'Morning' | 'Afternoon' | 'Night';
  timeSlot: string;
  title: string;
  action: string;
  whyItHelps: string;
  co2SavedKgPerWeek: number;
  pm25ReductionPct: number;
}

export interface IndoorAirHack {
  id: string;
  title: string;
  roomFocus: string;
  costTier: 'Free' | 'Under ₹500' | 'DIY Under ₹2,000';
  steps: string[];
  impactMetric: string;
  explanation: string;
  pm25ReductionPct: number;
}

export interface SustainableSwap {
  id: string;
  category: string;
  insteadOf: string;
  switchTo: string;
  co2SavedKgPerWeek: number;
  monthlySavingsInr: number;
  pm25ReductionPct: number;
  directImpactExplanation: string;
}

export interface FamilyAgeGuidance {
  children: string;
  adults: string;
  elderly: string;
}

export interface GeneratedAirPlan {
  location: string;
  smogSeverity: SmogSeverity;
  familyMode?: FamilyMode;
  generatedAt: string;
  isBaseline?: boolean;
  locationSummary: string;
  bestVentilationWindow: string;
  airAdvisory: string;
  outdoorActivityAdvice?: string;
  commuteAdvice?: string;
  familyGuidance?: FamilyAgeGuidance;
  dailyRoutine: RoutineStep[];
  indoorHacks: IndoorAirHack[];
  sustainableSwaps: SustainableSwap[];
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ImpactSummary {
  adoptedCount: number;
  totalSelectableCount: number;
  adoptionPct: number;
  weeklyCo2SavedKg: number;
  annualCo2SavedKg: number;
  indoorPm25CutPct: number;
  monthlySavingsInr: number;
  skyClarityScore: number;
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export type AlertChannel = 'browser_push' | 'in_app_only';

export interface HourlyPollutionPoint {
  hour: string;
  aqi: number;
  pm25: number;
  safeWindow?: boolean;
}

export interface WeeklyPollutionPoint {
  day: string;
  dateLabel?: string;
  aqi: number;
  pm25: number;
  peakPm25?: number;
}

export interface LocalAirReading {
  aqi: number;
  pm25?: number | null;
  pm10?: number | null;
  o3?: number | null;
  no2?: number | null;
  scaleLabel: string;
  category: string;
  source?: string;
  resolvedCity?: string;
  coords?: LatLngPoint;
  updatedAtIso?: string;
  dominantPollutant?: string;
  healthTip: string;
  severity: SmogSeverity;
  checkedAt: string;
  cleanestWindow?: CleanestWindowInfo;
  stationUnavailable?: boolean;
  isCached?: boolean;
  cachedTimestamp?: string;
  hourlyTrend?: HourlyPollutionPoint[];
  weeklyTrend?: WeeklyPollutionPoint[];
}

export interface SmogAlertSubscription {
  id: string;
  locationLabel: string;
  placeId?: string;
  lat: number;
  lng: number;
  thresholdAqi: number;
  channel: AlertChannel;
  pushPermission: NotificationPermission | 'unsupported';
  enabled: boolean;
  updatedAt: string;
  lastReading?: LocalAirReading;
}
