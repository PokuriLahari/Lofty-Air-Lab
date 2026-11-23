import type {
  AqiCategoryLabel,
  ChatLanguage,
  CleanestWindowInfo,
  HourlyPollutionPoint,
  SafetyVerdict,
  SmogSeverity,
  VerdictActivity,
  VerdictPerson,
  WeeklyPollutionPoint,
} from '../types/air';

export const PERSON_OPTIONS: Array<{ id: VerdictPerson; label: string; isVulnerable: boolean }> = [
  { id: 'adult', label: 'Adult', isVulnerable: false },
  { id: 'child', label: 'Child', isVulnerable: true },
  { id: 'elderly', label: 'Elderly', isVulnerable: true },
  { id: 'asthma', label: 'Asthma', isVulnerable: true },
];

export const ACTIVITY_OPTIONS: Array<{ id: VerdictActivity; label: string; highExertion: boolean }> = [
  { id: 'walk', label: 'Walk', highExertion: false },
  { id: 'run', label: 'Run', highExertion: true },
  { id: 'outdoor_work', label: 'Outdoor Work', highExertion: true },
  { id: 'errands', label: 'Errands', highExertion: false },
];

export const CHAT_LANGUAGE_OPTIONS: Array<{ id: ChatLanguage; label: string; nativeLabel: string }> = [
  { id: 'en', label: 'English', nativeLabel: 'English' },
  { id: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { id: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
];

export function formatIstTimestamp(dateInput: Date | string = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const safeDate = Number.isNaN(d.getTime()) ? new Date() : d;
  const formatted = safeDate.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${formatted.toUpperCase()} IST`;
}

export const AQI_SCALE_BANDS: Array<{
  category: AqiCategoryLabel;
  rangeLabel: string;
  min: number;
  max: number;
  badgeBg: string;
  badgeText: string;
  hexColor: string;
  severity: SmogSeverity;
}> = [
  {
    category: 'Good',
    rangeLabel: '0–50',
    min: 0,
    max: 50,
    badgeBg: 'bg-[#C8F542]',
    badgeText: 'text-[#111111]',
    hexColor: '#C8F542',
    severity: 'moderate',
  },
  {
    category: 'Moderate',
    rangeLabel: '51–100',
    min: 51,
    max: 100,
    badgeBg: 'bg-[#FFE14D]',
    badgeText: 'text-[#111111]',
    hexColor: '#FFE14D',
    severity: 'moderate',
  },
  {
    category: 'Poor',
    rangeLabel: '101–150',
    min: 101,
    max: 150,
    badgeBg: 'bg-[#FF6B35]',
    badgeText: 'text-white',
    hexColor: '#FF6B35',
    severity: 'sensitive',
  },
  {
    category: 'Unhealthy',
    rangeLabel: '151–200',
    min: 151,
    max: 200,
    badgeBg: 'bg-[#FF66B3]',
    badgeText: 'text-[#111111]',
    hexColor: '#FF66B3',
    severity: 'severe',
  },
  {
    category: 'Severe',
    rangeLabel: '200+',
    min: 201,
    max: 999,
    badgeBg: 'bg-[#FF3B5C]',
    badgeText: 'text-white',
    hexColor: '#FF3B5C',
    severity: 'hazardous',
  },
];

const KNOWN_CITY_COORDS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Gurugram', lat: 28.4595, lng: 77.0266 },
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Noida', lat: 28.5355, lng: 77.391 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
];

export function isCoordinateLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  return /^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(label.trim());
}

export function resolveNearestKnownCity(lat: number, lng: number): string {
  let bestName = 'Hyderabad';
  let bestDist = Number.POSITIVE_INFINITY;
  for (const city of KNOWN_CITY_COORDS) {
    const dLat = lat - city.lat;
    const dLng = lng - city.lng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < bestDist) {
      bestDist = dist;
      bestName = city.name;
    }
  }
  return bestName;
}

export function formatShortCityName(
  label: string | null | undefined,
  coords?: { lat: number; lng: number } | null
): string {
  const trimmed = (label ?? '').trim();
  if (!trimmed || isCoordinateLabel(trimmed)) {
    if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
      return resolveNearestKnownCity(coords.lat, coords.lng);
    }
    return 'Hyderabad';
  }
  const firstPart = trimmed.split(',')[0]?.trim();
  return firstPart || trimmed;
}

export function classifyOpenMeteoAqiBadge(
  pm25: number | null | undefined,
  aqi: number | null | undefined
): {
  category: AqiCategoryLabel;
  badgeBg: string;
  badgeText: string;
  hexColor: string;
  severity: SmogSeverity;
} {
  const pm = typeof pm25 === 'number' && Number.isFinite(pm25) ? pm25 : null;
  const aq = typeof aqi === 'number' && Number.isFinite(aqi) ? aqi : null;
  const effectiveAqi = aq ?? (pm !== null ? Math.round(pm * 2.1) : 0);

  if (effectiveAqi > 200) {
    return AQI_SCALE_BANDS[4];
  }
  if (effectiveAqi >= 151) {
    return AQI_SCALE_BANDS[3];
  }
  if (effectiveAqi >= 101) {
    return AQI_SCALE_BANDS[2];
  }
  if (effectiveAqi >= 51) {
    return AQI_SCALE_BANDS[1];
  }
  return AQI_SCALE_BANDS[0];
}

export interface VerdictResult {
  verdict: SafetyVerdict;
  status: 'ready' | 'unavailable';
  verdictBg: string;
  verdictText: string;
  headline: string;
  actionTip: string;
  vulnerableReason: string | null;
}

export function computeSafetyVerdict(params: {
  pm25: number | null | undefined;
  aqi?: number | null | undefined;
  person: VerdictPerson;
  activity: VerdictActivity;
  stationUnavailable?: boolean;
}): VerdictResult {
  const { pm25, aqi, person, activity, stationUnavailable } = params;
  const pm = typeof pm25 === 'number' && Number.isFinite(pm25) ? pm25 : null;
  const aq = typeof aqi === 'number' && Number.isFinite(aqi) ? aqi : null;

  if (stationUnavailable || (pm === null && aq === null)) {
    return {
      verdict: 'Go easy',
      status: 'unavailable',
      verdictBg: 'bg-[#F7F5EE]',
      verdictText: 'text-[#111111]',
      headline: 'Live reading is unavailable for this spot.',
      actionTip: 'Check a nearby metro city or click Retry before intense outdoor exercise.',
      vulnerableReason:
        person !== 'adult'
          ? 'Because no live station reading is available, sensitive groups should keep masks handy outdoors.'
          : null,
    };
  }

  // Fallback estimate only if AQI exists and PM2.5 missing
  const effectivePm25 = pm !== null ? pm : Math.max(10, Math.round((aq ?? 50) * 0.48));
  const isVulnerable = person === 'child' || person === 'elderly' || person === 'asthma';
  const isHighExertion = activity === 'run' || activity === 'outdoor_work';

  const personLabel =
    person === 'child'
      ? 'children'
      : person === 'elderly'
        ? 'elderly adults'
        : person === 'asthma'
          ? 'people with asthma'
          : 'healthy adults';

  // Fixed deterministic rules based on PM2.5 thresholds:
  // < 30 = Good to go
  // 30-60 = Go easy
  // 60-100 = Go easy for healthy adults; Stay in if vulnerable + high exertion (Go easy with mask for gentle walk/errands)
  // > 100 = Stay in for vulnerable; Go easy short mask-only errands for healthy adults (Stay in if running/heavy work)
  // > 150 = Stay in for all

  if (effectivePm25 > 150) {
    return {
      verdict: 'Stay in',
      status: 'ready',
      verdictBg: 'bg-[#FF3B5C]',
      verdictText: 'text-white',
      headline: 'Stay indoors and keep balcony windows closed.',
      actionTip:
        'Skip morning jogs and outdoor errands; wear an N95 mask for any essential step outside.',
      vulnerableReason: isVulnerable
        ? `Severe fine smoke (${Math.round(effectivePm25)} µg/m³) makes outdoor breathing unsafe for ${personLabel}.`
        : null,
    };
  }

  if (effectivePm25 > 100) {
    if (isVulnerable) {
      return {
        verdict: 'Stay in',
        status: 'ready',
        verdictBg: 'bg-[#FF66B3]',
        verdictText: 'text-[#111111]',
        headline: `Stay in today — air is too smoky for ${personLabel}.`,
        actionTip:
          'Keep windows shut, skip park play or morning walks, and run an indoor filter or fan filter.',
        vulnerableReason: `Stricter rule applied for ${personLabel}: PM2.5 above 100 µg/m³ triggers coughing and airway flare-ups.`,
      };
    }
    if (isHighExertion) {
      return {
        verdict: 'Stay in',
        status: 'ready',
        verdictBg: 'bg-[#FF66B3]',
        verdictText: 'text-[#111111]',
        headline: `Move ${activity === 'run' ? 'your run' : 'heavy work'} indoors.`,
        actionTip:
          'Fast breathing pulls fine smoke deep into lungs; limit outdoor trips to short masked errands.',
        vulnerableReason: null,
      };
    }
    return {
      verdict: 'Go easy',
      status: 'ready',
      verdictBg: 'bg-[#FF6B35]',
      verdictText: 'text-white',
      headline: 'Keep trips short and wear a well-fitted mask.',
      actionTip:
        'Stick to shaded society paths rather than main roads and close flat doors during evening traffic.',
      vulnerableReason: null,
    };
  }

  if (effectivePm25 > 60) {
    if (isVulnerable && isHighExertion) {
      return {
        verdict: 'Stay in',
        status: 'ready',
        verdictBg: 'bg-[#FF6B35]',
        verdictText: 'text-white',
        headline: `Skip outdoor ${activity === 'run' ? 'running' : 'heavy work'} for ${personLabel}.`,
        actionTip:
          'Switch to indoor stretching now or wait for the cleaner afternoon window with a mask.',
        vulnerableReason: `Stricter rule for ${personLabel}: heavy breathing when PM2.5 is above 60 µg/m³ irritates sensitive lungs.`,
      };
    }
    if (isVulnerable) {
      return {
        verdict: 'Go easy',
        status: 'ready',
        verdictBg: 'bg-[#FFE14D]',
        verdictText: 'text-[#111111]',
        headline: `Take it slow outside and carry a mask for ${personLabel}.`,
        actionTip:
          'Avoid early-morning roadside haze and keep walks under 20 minutes during the midday dip.',
        vulnerableReason: `Stricter notice for ${personLabel}: PM2.5 (${Math.round(effectivePm25)} µg/m³) is above India’s 60 µg/m³ safe limit.`,
      };
    }
    return {
      verdict: 'Go easy',
      status: 'ready',
      verdictBg: 'bg-[#FFE14D]',
      verdictText: 'text-[#111111]',
      headline: isHighExertion
        ? 'Dial back intense pace near main roads.'
        : 'Safe for quick errands; avoid lingering near traffic.',
      actionTip: isHighExertion
        ? 'Prefer a gentler pace away from arterial roads or wait for the afternoon cleanest window.'
        : 'Carry a mask for busy intersections and turn car AC to recirculate.',
      vulnerableReason: null,
    };
  }

  if (effectivePm25 >= 30) {
    if (isVulnerable && isHighExertion) {
      return {
        verdict: 'Go easy',
        status: 'ready',
        verdictBg: 'bg-[#FFE14D]',
        verdictText: 'text-[#111111]',
        headline: `Go easy — warm up gently and watch for coughing.`,
        actionTip:
          'Choose the cleanest 2-hour afternoon window and keep rescue inhaler or mask handy.',
        vulnerableReason: `Moderate-haze caution for ${personLabel} during brisk exertion (PM2.5 ${Math.round(effectivePm25)} µg/m³).`,
      };
    }
    return {
      verdict: 'Go easy',
      status: 'ready',
      verdictBg: 'bg-[#FFE14D]',
      verdictText: 'text-[#111111]',
      headline: isVulnerable
        ? 'Okay for calm walks or errands; avoid busy road dust.'
        : 'Normal errands are fine; pace heavy outdoor workouts.',
      actionTip:
        'Pick tree-lined society paths and crack opposite windows only during the afternoon window.',
      vulnerableReason: isVulnerable
        ? `Gentle caution for ${personLabel} while PM2.5 sits between 30 and 60 µg/m³.`
        : null,
    };
  }

  // PM2.5 < 30
  return {
    verdict: 'Good to go',
    status: 'ready',
    verdictBg: 'bg-[#C8F542]',
    verdictText: 'text-[#111111]',
    headline: 'Clean air right now — safe for outdoor plans.',
    actionTip:
      activity === 'run' || activity === 'outdoor_work'
        ? 'Comfortable breathing conditions; stay hydrated and still pick green society lanes away from tailpipes.'
        : 'Great window for walks, park play, and fresh cross-ventilation through your flat.',
    vulnerableReason:
      person === 'asthma'
        ? 'PM2.5 is under 30 µg/m³, which is comfortable—just keep regular medication handy as usual.'
        : null,
  };
}

function formatHourShort(hour24: number): string {
  const normalized = ((hour24 % 24) + 24) % 24;
  if (normalized === 0) return '12 AM';
  if (normalized === 12) return '12 PM';
  if (normalized < 12) return `${normalized} AM`;
  return `${normalized - 12} PM`;
}

function formatCompactWindow(startHour24: number, endHour24: number): string {
  const s = ((startHour24 % 24) + 24) % 24;
  const e = ((endHour24 % 24) + 24) % 24;
  const sPeriod = s >= 12 ? 'PM' : 'AM';
  const ePeriod = e >= 12 ? 'PM' : 'AM';
  const sNum = s % 12 === 0 ? 12 : s % 12;
  const eNum = e % 12 === 0 ? 12 : e % 12;
  if (sPeriod === ePeriod) {
    return `${sNum}–${eNum} ${ePeriod}`;
  }
  return `${sNum} ${sPeriod}–${eNum} ${ePeriod}`;
}

function extractHourFromIso(iso: string): number | null {
  // Expected format: "2026-11-23T14:00"
  const match = iso.match(/T(\d{2}):/);
  if (!match) return null;
  return Number(match[1]);
}

export function findCleanestTwoHourWindow(
  hourlyTimes: string[],
  hourlyPm25: Array<number | null>
): CleanestWindowInfo {
  if (!Array.isArray(hourlyTimes) || !Array.isArray(hourlyPm25) || hourlyTimes.length < 2) {
    return {
      windowLabel: '3–5 PM',
      startHour: '3 PM',
      endHour: '5 PM',
      avgPm25: null,
      note: 'Early afternoon sunlight usually disperses low winter haze.',
    };
  }

  let bestStartIdx = -1;
  let bestAvg = Number.POSITIVE_INFINITY;

  for (let i = 0; i < hourlyTimes.length - 1; i += 1) {
    const h1 = extractHourFromIso(hourlyTimes[i]);
    const h2 = extractHourFromIso(hourlyTimes[i + 1]);
    const v1 = hourlyPm25[i];
    const v2 = hourlyPm25[i + 1];

    if (
      h1 === null ||
      h2 === null ||
      typeof v1 !== 'number' ||
      typeof v2 !== 'number' ||
      !Number.isFinite(v1) ||
      !Number.isFinite(v2)
    ) {
      continue;
    }

    // Daylight hours window: start between 6 AM and 4 PM (ending by 6 PM)
    if (h1 >= 6 && h1 <= 16) {
      const avg = (v1 + v2) / 2;
      if (avg < bestAvg) {
        bestAvg = avg;
        bestStartIdx = i;
      }
    }
  }

  if (bestStartIdx === -1) {
    return {
      windowLabel: '3–5 PM',
      startHour: '3 PM',
      endHour: '5 PM',
      avgPm25: null,
      note: 'Estimated daylight dip while hourly forecast data settles.',
    };
  }

  const startH = extractHourFromIso(hourlyTimes[bestStartIdx]) ?? 15;
  const endH = (startH + 2) % 24;
  const roundedAvg = Math.round(bestAvg);

  return {
    windowLabel: formatCompactWindow(startH, endH),
    startHour: formatHourShort(startH),
    endHour: formatHourShort(endH),
    avgPm25: roundedAvg,
    note: `Cleanest daylight stretch in the next 24h (avg PM2.5 ${roundedAvg}).`,
  };
}

export function buildNext24HourCurve(
  hourlyTimes: string[],
  hourlyPm25: Array<number | null>,
  hourlyAqi: Array<number | null>,
  cleanestStartHourShort: string
): HourlyPollutionPoint[] {
  const points: HourlyPollutionPoint[] = [];
  for (let i = 0; i < hourlyTimes.length; i += 2) {
    const h = extractHourFromIso(hourlyTimes[i]);
    const pm = hourlyPm25[i];
    const aqi = hourlyAqi[i];
    if (h === null || typeof pm !== 'number' || !Number.isFinite(pm)) continue;
    const hourStr = formatHourShort(h);
    points.push({
      hour: hourStr,
      pm25: Math.round(pm),
      aqi: typeof aqi === 'number' && Number.isFinite(aqi) ? Math.round(aqi) : Math.round(pm * 2.1),
      safeWindow: hourStr === cleanestStartHourShort,
    });
    if (points.length >= 12) break;
  }
  return points;
}

export function buildWeeklyPm25TrendFromOpenMeteo(
  hourlyTimes: string[],
  hourlyPm25: Array<number | null>,
  hourlyAqi: Array<number | null>
): WeeklyPollutionPoint[] {
  const byDate = new Map<
    string,
    { sumPm: number; countPm: number; maxPm: number; sumAqi: number; countAqi: number }
  >();

  for (let i = 0; i < hourlyTimes.length; i += 1) {
    const timeStr = hourlyTimes[i];
    if (typeof timeStr !== 'string') continue;
    const dateKey = timeStr.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;

    const pm = hourlyPm25[i];
    const aq = hourlyAqi[i];
    if (typeof pm !== 'number' || !Number.isFinite(pm)) continue;

    const existing = byDate.get(dateKey) ?? {
      sumPm: 0,
      countPm: 0,
      maxPm: 0,
      sumAqi: 0,
      countAqi: 0,
    };
    existing.sumPm += pm;
    existing.countPm += 1;
    existing.maxPm = Math.max(existing.maxPm, pm);
    if (typeof aq === 'number' && Number.isFinite(aq)) {
      existing.sumAqi += aq;
      existing.countAqi += 1;
    }
    byDate.set(dateKey, existing);
  }

  const sortedDates = Array.from(byDate.keys()).sort();
  // Keep up to the 7 completed/current historical days ending at today (exclude tomorrow's forecast from weekly history)
  const historyDates = sortedDates.slice(-8, sortedDates.length > 7 ? -1 : undefined).slice(-7);

  return historyDates.map((dateKey, idx) => {
    const entry = byDate.get(dateKey)!;
    const avgPm = Math.round(entry.sumPm / Math.max(1, entry.countPm));
    const avgAqi =
      entry.countAqi > 0
        ? Math.round(entry.sumAqi / entry.countAqi)
        : Math.round(avgPm * 2.1);
    const parsedDate = new Date(`${dateKey}T12:00:00Z`);
    const weekday =
      idx === historyDates.length - 1
        ? 'Today'
        : parsedDate.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' });

    return {
      day: weekday,
      dateLabel: dateKey,
      pm25: avgPm,
      peakPm25: Math.round(entry.maxPm),
      aqi: avgAqi,
    };
  });
}

export function calculateWeeklyPm25Change(points: WeeklyPollutionPoint[]): {
  pctChange: number;
  direction: 'improved' | 'worsened' | 'steady';
  summaryText: string;
} {
  if (!Array.isArray(points) || points.length < 2) {
    return {
      pctChange: 0,
      direction: 'steady',
      summaryText: 'Collecting 7-day baseline to measure improvement.',
    };
  }
  const first = points[0].pm25;
  const last = points[points.length - 1].pm25;
  if (first <= 0) {
    return { pctChange: 0, direction: 'steady', summaryText: 'Steady over the last 7 days.' };
  }
  const rawPct = Math.round(((last - first) / first) * 100);
  if (rawPct <= -5) {
    return {
      pctChange: rawPct,
      direction: 'improved',
      summaryText: `${Math.abs(rawPct)}% lower PM2.5 than 7 days ago`,
    };
  }
  if (rawPct >= 5) {
    return {
      pctChange: rawPct,
      direction: 'worsened',
      summaryText: `${rawPct}% higher PM2.5 than 7 days ago`,
    };
  }
  return {
    pctChange: rawPct,
    direction: 'steady',
    summaryText: 'PM2.5 stayed fairly steady over the last 7 days',
  };
}
