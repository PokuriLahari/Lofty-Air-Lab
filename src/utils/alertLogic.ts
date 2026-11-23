import type {
  AlertChannel,
  FamilyMode,
  HourlyPollutionPoint,
  LocalAirReading,
  SmogAlertSubscription,
  SmogSeverity,
  WeeklyPollutionPoint,
} from '../types/air';

export interface GoogleAqiIndex {
  code?: string;
  displayName?: string;
  aqi?: number;
  aqiDisplay?: string;
  category?: string;
  dominantPollutant?: string;
}

export interface GooglePollutant {
  code?: string;
  displayName?: string;
  concentration?: {
    value?: number;
    units?: string;
  };
}

export interface GoogleAirQualityResponse {
  dateTime?: string;
  regionCode?: string;
  indexes?: GoogleAqiIndex[];
  pollutants?: GooglePollutant[];
  healthRecommendations?: {
    generalPopulation?: string;
    elderly?: string;
    children?: string;
  };
}

export function classifyLocalAqiBand(aqi: number): {
  severity: SmogSeverity;
  shortLabel: string;
  actionTip: string;
} {
  if (aqi > 200) {
    return {
      severity: 'hazardous',
      shortLabel: 'Severe',
      actionTip:
        'Keep balcony doors sealed, skip early walks, and run a purifier or DIY fan filter in bedrooms.',
    };
  }
  if (aqi >= 151) {
    return {
      severity: 'severe',
      shortLabel: 'Unhealthy',
      actionTip:
        'Shut balcony sliders during peak morning/evening traffic, switch on the kitchen chimney, and wet-mop floors.',
    };
  }
  if (aqi >= 101) {
    return {
      severity: 'sensitive',
      shortLabel: 'Poor',
      actionTip:
        'Sensitive members and kids should avoid roadside exertion; ventilate briefly only around afternoon sun.',
    };
  }
  if (aqi >= 51) {
    return {
      severity: 'moderate',
      shortLabel: 'Moderate',
      actionTip:
        'Normal outdoor society walks are fine; keep kitchen chimney on while cooking.',
    };
  }
  return {
    severity: 'moderate',
    shortLabel: 'Good',
    actionTip:
      'Clean outside air; great time for cross-ventilation and outdoor activity.',
  };
}

export function estimatePmFromAqi(aqi: number): { pm25: number; pm10: number } {
  const safeAqi = Math.max(15, Math.min(500, Math.round(aqi)));
  const pm25 = Math.max(8, Math.round(safeAqi * 0.48));
  const pm10 = Math.max(16, Math.round(pm25 * 1.65));
  return { pm25, pm10 };
}

export function buildDiurnalPollutionTrend(
  currentAqi: number,
  currentPm25?: number
): HourlyPollutionPoint[] {
  const baseAqi = Math.max(25, Math.min(480, Math.round(currentAqi)));
  const basePm25 =
    typeof currentPm25 === 'number' && Number.isFinite(currentPm25)
      ? Math.max(8, Math.round(currentPm25))
      : estimatePmFromAqi(baseAqi).pm25;

  // Typical urban winter diurnal curve: morning traffic inversion peak (8 AM), afternoon dip (2 PM-4 PM), late evening peak (10 PM)
  const slots: Array<{ hour: string; factor: number; safeWindow?: boolean }> = [
    { hour: '6 AM', factor: 1.12 },
    { hour: '8 AM', factor: 1.24 },
    { hour: '10 AM', factor: 1.06 },
    { hour: '12 PM', factor: 0.84 },
    { hour: '2 PM', factor: 0.68, safeWindow: true },
    { hour: '4 PM', factor: 0.72, safeWindow: true },
    { hour: '6 PM', factor: 0.96 },
    { hour: '8 PM', factor: 1.16 },
    { hour: '10 PM', factor: 1.22 },
    { hour: '12 AM', factor: 1.08 },
  ];

  return slots.map((slot) => ({
    hour: slot.hour,
    aqi: Math.max(18, Math.min(500, Math.round(baseAqi * slot.factor))),
    pm25: Math.max(6, Math.round(basePm25 * slot.factor)),
    safeWindow: slot.safeWindow,
  }));
}

export function buildWeeklyPollutionTrend(
  currentAqi: number,
  currentPm25?: number
): WeeklyPollutionPoint[] {
  const baseAqi = Math.max(25, Math.min(480, Math.round(currentAqi)));
  const basePm25 =
    typeof currentPm25 === 'number' && Number.isFinite(currentPm25)
      ? Math.max(8, Math.round(currentPm25))
      : estimatePmFromAqi(baseAqi).pm25;

  const days = [
    { day: 'Mon', factor: 0.94 },
    { day: 'Tue', factor: 1.05 },
    { day: 'Wed', factor: 1.11 },
    { day: 'Thu', factor: 0.89 },
    { day: 'Fri', factor: 1.04 },
    { day: 'Sat', factor: 0.96 },
    { day: 'Today', factor: 1.0 },
  ];

  return days.map((d) => ({
    day: d.day,
    aqi: Math.max(18, Math.min(500, Math.round(baseAqi * d.factor))),
    pm25: Math.max(6, Math.round(basePm25 * d.factor)),
  }));
}

export function normalizeGoogleAirQualityResponse(
  payload: GoogleAirQualityResponse | null | undefined,
  checkedAt = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
): LocalAirReading {
  const indexes = Array.isArray(payload?.indexes) ? payload.indexes : [];
  // Prefer local national AQI scale (e.g., ind_cpcb or usa_epa where higher = worse smog)
  const localIndex =
    indexes.find((idx) => idx.code && idx.code !== 'uaqi') ??
    indexes.find((idx) => idx.code === 'uaqi') ??
    indexes[0];

  let resolvedAqi = 120;
  let scaleLabel = 'Local Air Index';

  if (localIndex && typeof localIndex.aqi === 'number') {
    if (localIndex.code === 'uaqi') {
      // Universal AQI runs 0 (worst) to 100 (cleanest); map smoothly onto familiar 0-500 scale
      const uaqi = Math.max(0, Math.min(100, localIndex.aqi));
      resolvedAqi = Math.round(((100 - uaqi) / 100) * 350 + 25);
      scaleLabel = 'Estimated Local AQI (from UAQI)';
    } else {
      resolvedAqi = Math.max(0, Math.round(localIndex.aqi));
      scaleLabel = localIndex.displayName || 'Local AQI';
    }
  } else {
    // Fallback to pm25 concentration estimate if indexes missing
    const pm25Raw = payload?.pollutants?.find((p) => p.code === 'pm25')?.concentration?.value;
    if (typeof pm25Raw === 'number' && Number.isFinite(pm25Raw)) {
      resolvedAqi = Math.max(20, Math.round(pm25Raw * 2.1));
      scaleLabel = 'Estimated AQI (Fine Dust)';
    }
  }

  const rawPm25 = payload?.pollutants?.find((p) => p.code === 'pm25')?.concentration?.value;
  const rawPm10 = payload?.pollutants?.find((p) => p.code === 'pm10')?.concentration?.value;
  const fallbackPm = estimatePmFromAqi(resolvedAqi);

  const pm25 =
    typeof rawPm25 === 'number' && Number.isFinite(rawPm25)
      ? Math.max(5, Math.round(rawPm25))
      : fallbackPm.pm25;
  const pm10 =
    typeof rawPm10 === 'number' && Number.isFinite(rawPm10)
      ? Math.max(10, Math.round(rawPm10))
      : fallbackPm.pm10;

  const band = classifyLocalAqiBand(resolvedAqi);
  const rec =
    payload?.healthRecommendations?.children ||
    payload?.healthRecommendations?.generalPopulation ||
    band.actionTip;

  return {
    aqi: resolvedAqi,
    pm25,
    pm10,
    scaleLabel,
    category: localIndex?.category || band.shortLabel,
    dominantPollutant: localIndex?.dominantPollutant
      ? localIndex.dominantPollutant.toUpperCase()
      : 'PM2.5',
    healthTip: rec,
    severity: band.severity,
    checkedAt,
    hourlyTrend: buildDiurnalPollutionTrend(resolvedAqi, pm25),
    weeklyTrend: buildWeeklyPollutionTrend(resolvedAqi, pm25),
  };
}

export function getFamilyModeAdvisory(
  aqi: number,
  mode: FamilyMode
): { headline: string; outdoorLimit: string; indoorPriority: string } {
  const highSmog = aqi >= 150;
  const extreme = aqi >= 250;

  switch (mode) {
    case 'children':
      return {
        headline: extreme
          ? 'Keep school sports and society park play indoors today; use well-fitted masks at bus gates.'
          : highSmog
            ? 'Limit evening park play before 5 PM and wash hands/face right after school drop.'
            : 'Short afternoon society play between 2 PM and 4 PM is comfortable today.',
        outdoorLimit: extreme ? 'Max 10 min urgent transit only' : highSmog ? '20–30 min midday' : '45–60 min normal play',
        indoorPriority: 'Run DIY fan filter or purifier in kids’ bedroom 2 hours before bedtime.',
      };
    case 'elderly':
      return {
        headline: extreme
          ? 'Skip 6 AM morning walks—heavy morning smog irritates lungs and raises heart strain.'
          : highSmog
            ? 'Move society walks to sunny 2 PM–3:30 PM hours or walk indoors along shaded corridors.'
            : 'Comfortable for relaxed midday walks; keep rooms warm without coil heaters.',
        outdoorLimit: extreme ? 'Stay indoors; terrace sun only around 2 PM' : highSmog ? '15–20 min sunny midday only' : '30–45 min slow walk',
        indoorPriority: 'Seal bedroom balcony gaps with foam tape and keep moisture steady with damp mopping.',
      };
    case 'adults':
      return {
        headline: extreme
          ? 'Avoid jogging near busy main roads; switch morning solo cab/car runs to carpool or metro.'
          : highSmog
            ? 'Wear an N95 mask at metro feeders and turn car AC to recirculate inside traffic.'
            : 'Great day for brisk society walks or cycling after 1:30 PM.',
        outdoorLimit: extreme ? 'Commute in N95; indoor workout' : highSmog ? 'No roadside running; indoor cardio' : 'Normal commute & outdoor walk',
        indoorPriority: 'Run kitchen chimney 2 minutes before tadka and switch morning chai water to electric kettle.',
      };
    case 'all':
    default:
      return {
        headline: extreme
          ? 'Seal balcony sliders, wet-mop floors, and run clean bedroom air setup all evening.'
          : highSmog
            ? 'Follow the 2:30 PM brief cross-breeze rule and share school or metro rides at the gate.'
            : 'Air is manageable today—focus on smokeless cooking and avoiding morning idling.',
        outdoorLimit: extreme ? 'Minimal essential travel only' : highSmog ? 'Safest window: 2 PM – 4 PM' : 'Midday & afternoon open',
        indoorPriority: 'Chimney-first cooking, wet mopping instead of dry broom, and tightly sealed balcony sliders.',
      };
  }
}

export function getVentilationStatus(
  aqi: number,
  cleanestWindowLabel = '3–5 PM'
): {
  statusLabel: string;
  bestHours: string;
  guidance: string;
} {
  if (aqi > 200) {
    return {
      statusLabel: 'Keep Doors Sealed',
      bestHours: cleanestWindowLabel,
      guidance:
        'Outside smog is too thick for open windows. Keep cross-breeze to 5–10 minutes during the cleanest stretch and rely on wet mopping + bedroom filter.',
    };
  }
  if (aqi >= 151) {
    return {
      statusLabel: 'Open Midday Only',
      bestHours: cleanestWindowLabel,
      guidance:
        'Wait for the afternoon sun to lift low winter smog before airing rooms briefly. Shut all balcony doors before evening traffic.',
    };
  }
  if (aqi >= 101) {
    return {
      statusLabel: 'Selective Afternoon Airing',
      bestHours: cleanestWindowLabel,
      guidance:
        'Keep road-facing windows closed during morning traffic (7–10 AM); open opposite windows during the cleanest afternoon stretch.',
    };
  }
  return {
    statusLabel: 'Safe to Ventilate',
    bestHours: cleanestWindowLabel,
    guidance:
      'Outside air is comfortable for cross-ventilation during daylight hours; still run the chimney during frying.',
  };
}

export function shouldTriggerSmogAlert(
  reading: Pick<LocalAirReading, 'aqi'> | null | undefined,
  thresholdAqi: number,
  enabled = true
): boolean {
  if (!enabled || !reading || !Number.isFinite(reading.aqi)) return false;
  return reading.aqi >= thresholdAqi;
}

export function formatAlertBannerCopy(
  subscription: Pick<SmogAlertSubscription, 'locationLabel' | 'thresholdAqi'>,
  reading: Pick<LocalAirReading, 'aqi' | 'category' | 'healthTip'>
): { title: string; body: string } {
  return {
    title: `Extreme Smog Alert · ${subscription.locationLabel} (AQI ${reading.aqi})`,
    body: `Crossed your ${subscription.thresholdAqi}+ limit (${reading.category}). ${reading.healthTip}`,
  };
}

export function validateAlertSubscriptionInput(raw: {
  locationLabel?: unknown;
  lat?: unknown;
  lng?: unknown;
  thresholdAqi?: unknown;
  channel?: unknown;
}): {
  valid: boolean;
  error?: string;
  sanitized?: {
    locationLabel: string;
    lat: number;
    lng: number;
    thresholdAqi: number;
    channel: AlertChannel;
  };
} {
  const locationLabel =
    typeof raw.locationLabel === 'string' ? raw.locationLabel.trim().slice(0, 140) : '';
  if (locationLabel.length < 2) {
    return { valid: false, error: 'Please choose or search your neighborhood or society.' };
  }

  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { valid: false, error: 'Please pick a valid spot on the map.' };
  }

  const thresholdRaw = Number(raw.thresholdAqi);
  const thresholdAqi = [101, 151, 201].includes(thresholdRaw) ? thresholdRaw : 151;
  const channel: AlertChannel = raw.channel === 'in_app_only' ? 'in_app_only' : 'browser_push';

  return {
    valid: true,
    sanitized: { locationLabel, lat, lng, thresholdAqi, channel },
  };
}
