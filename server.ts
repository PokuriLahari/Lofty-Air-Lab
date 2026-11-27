import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  buildDiurnalPollutionTrend,
  buildWeeklyPollutionTrend,
  classifyLocalAqiBand,
  estimatePmFromAqi,
  normalizeGoogleAirQualityResponse,
  shouldTriggerSmogAlert,
  validateAlertSubscriptionInput,
} from './src/utils/alertLogic.ts';
import {
  buildNext24HourCurve,
  buildWeeklyPm25TrendFromOpenMeteo,
  classifyOpenMeteoAqiBadge,
  findCleanestTwoHourWindow,
  formatIstTimestamp,
  formatShortCityName,
  isCoordinateLabel,
  resolveNearestKnownCity,
} from './src/utils/verdictRules.ts';
import type { ChatLanguage, CitySuggestion, FamilyMode, LocalAirReading, SmogAlertSubscription } from './src/types/air.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

const GMP_ATTRIBUTION_HEADER = 'gmp_mcp_codeassist_v1_aistudio';
const alertSubscriptions = new globalThis.Map<string, SmogAlertSubscription>();

function getGoogleMapsApiKey(): string | null {
  const key =
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GMP_API_KEY ||
    '';
  if (!key || key === 'MY_GOOGLE_MAPS_API_KEY') {
    return null;
  }
  return key.trim();
}

function isQuotaExhaustedPayload(status: number, bodyText: string): boolean {
  if (status === 429) return true;
  return /RESOURCE_EXHAUSTED|OVER_QUERY_LIMIT|QuotaExceeded/i.test(bodyText);
}

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const VALID_SEVERITIES = new Set(['moderate', 'sensitive', 'severe', 'hazardous']);
const VALID_FAMILY_MODES = new Set(['all', 'children', 'adults', 'elderly']);
const VALID_HOUSEHOLDS = new Set(['family_kids', 'multigen_seniors', 'couple_solo', 'shared_house']);
const VALID_HEATING = new Set(['gas_furnace', 'wood_coal', 'electric_heat_pump', 'drafty_apartment']);
const VALID_COMMUTES = new Set(['gas_car', 'public_transit', 'bike_walk', 'remote_home']);

const FAMILY_MODE_TEXT: Record<string, string> = {
  all: 'Whole flat (balanced care for kids, working adults, and elders)',
  children: 'Children & school age (school gate waits, outdoor play safety, clean sleep air)',
  adults: 'Working adults (low-emission metro/carpool commute, N95 transit protection, home workspace)',
  elderly: 'Elderly parents & grandparents (skip 6 AM walks, warm draft-free rooms, gentle midday strolls)',
};

const HOUSEHOLD_TEXT: Record<string, string> = {
  family_kids: 'Parents + kids living in a 2BHK or 3BHK society flat',
  multigen_seniors: 'Joint family with elderly parents or grandparents in an apartment',
  couple_solo: 'Working couple or solo resident in a flat',
  shared_house: 'Shared flat with roommates or bachelors',
};

const HEATING_TEXT: Record<string, string> = {
  gas_furnace: 'PNG or LPG gas stove with kitchen chimney',
  wood_coal: 'Open kitchen without strong chimney + winter room heaters',
  electric_heat_pump: 'Electric / induction kitchen setup',
  drafty_apartment: 'High-rise apartment with loose balcony sliding doors or road-facing windows',
};

const COMMUTE_TEXT: Record<string, string> = {
  gas_car: 'Solo car, auto, or cab trips',
  public_transit: 'Metro, society shuttle bus, or tower carpool',
  bike_walk: 'Walking or cycling inside the society / nearby',
  remote_home: 'Working or studying from home',
};

const SEVERITY_TEXT: Record<string, string> = {
  moderate: 'Light Haze (AQI 51-100)',
  sensitive: 'Noticeable Smog (AQI 101-150)',
  severe: 'Heavy Winter Smog (AQI 151-250)',
  hazardous: 'Severe Smog Alert (AQI 250+)',
};

const airPlanSchema = {
  type: Type.OBJECT,
  properties: {
    locationSummary: {
      type: Type.STRING,
      description:
        '2 short, easy-to-understand sentences explaining why smog or dust builds up around flats in this Indian area, without technical jargon.',
    },
    bestVentilationWindow: {
      type: Type.STRING,
      description:
        'Exact best time of day to open apartment balcony doors briefly, and when to keep windows shut.',
    },
    airAdvisory: {
      type: Type.STRING,
      description: '1-2 simple sentences giving the most important protective step for today.',
    },
    outdoorActivityAdvice: {
      type: Type.STRING,
      description:
        'Safer outdoor activity recommendation and exact best available hours for walks or kids outdoor play.',
    },
    commuteAdvice: {
      type: Type.STRING,
      description:
        'Low-emission daily travel and school/office commute guidance tailored to pollution level.',
    },
    familyGuidance: {
      type: Type.OBJECT,
      properties: {
        children: {
          type: Type.STRING,
          description: 'Specific clean-air safety & outdoor play rule for children.',
        },
        adults: {
          type: Type.STRING,
          description: 'Specific commute, cooking, and outdoor workout guidance for adults.',
        },
        elderly: {
          type: Type.STRING,
          description: 'Specific breathing care, walk timing, and room warmth guidance for elderly members.',
        },
      },
      required: ['children', 'adults', 'elderly'],
    },
    dailyRoutine: {
      type: Type.ARRAY,
      description: 'Exactly 3 simple routine steps: 1 Morning, 1 Afternoon, 1 Night — one concise line each.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          period: { type: Type.STRING, enum: ['Morning', 'Afternoon', 'Night'] },
          timeSlot: { type: Type.STRING },
          title: { type: Type.STRING },
          action: { type: Type.STRING },
          whyItHelps: {
            type: Type.STRING,
            description: 'Plain everyday explanation of why this helps family breathing and air.',
          },
          co2SavedKgPerWeek: { type: Type.NUMBER },
          pm25ReductionPct: { type: Type.NUMBER },
        },
        required: [
          'id',
          'period',
          'timeSlot',
          'title',
          'action',
          'whyItHelps',
          'co2SavedKgPerWeek',
          'pm25ReductionPct',
        ],
      },
    },
    indoorHacks: {
      type: Type.ARRAY,
      description: 'Exactly 4 easy indoor air hacks for an Indian flat or high-rise apartment.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          roomFocus: { type: Type.STRING },
          costTier: { type: Type.STRING, enum: ['Free', 'Under ₹500', 'DIY Under ₹2,000'] },
          steps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          impactMetric: { type: Type.STRING },
          explanation: {
            type: Type.STRING,
            description: 'Simple everyday explanation with zero hard technical words.',
          },
          pm25ReductionPct: { type: Type.NUMBER },
        },
        required: [
          'id',
          'title',
          'roomFocus',
          'costTier',
          'steps',
          'impactMetric',
          'explanation',
          'pm25ReductionPct',
        ],
      },
    },
    sustainableSwaps: {
      type: Type.ARRAY,
      description: 'Exactly 4 practical Instead-of-X -> Switch-to-Y Indian flat or society swaps.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          category: { type: Type.STRING },
          insteadOf: { type: Type.STRING },
          switchTo: { type: Type.STRING },
          co2SavedKgPerWeek: { type: Type.NUMBER },
          monthlySavingsInr: {
            type: Type.NUMBER,
            description: 'Realistic monthly savings in Indian Rupees (₹), e.g., 250 to 2500.',
          },
          pm25ReductionPct: { type: Type.NUMBER },
          directImpactExplanation: {
            type: Type.STRING,
            description: 'Plain-language reason why this keeps the flat and society air cleaner.',
          },
        },
        required: [
          'id',
          'category',
          'insteadOf',
          'switchTo',
          'co2SavedKgPerWeek',
          'monthlySavingsInr',
          'pm25ReductionPct',
          'directImpactExplanation',
        ],
      },
    },
  },
  required: [
    'locationSummary',
    'bestVentilationWindow',
    'airAdvisory',
    'outdoorActivityAdvice',
    'commuteAdvice',
    'familyGuidance',
    'dailyRoutine',
    'indoorHacks',
    'sustainableSwaps',
  ],
};

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|500|502|503|504|ETIMEDOUT|ECONNRESET|fetch failed/i.test(msg);
}

async function callWithRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries && isTransientError(err)) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

async function fetchSearchGroundedAirQuality(locationLabel: string, lat: number, lng: number) {
  const checkedAt = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const target = locationLabel && locationLabel.trim().length > 1
    ? locationLabel.trim()
    : `${lat.toFixed(3)}, ${lng.toFixed(3)}`;

  const ai = createGeminiClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `What is the current AQI (Air Quality Index), PM2.5, PM10, and dominant pollutant today near ${target}? Reply in exactly this single-line format with realistic current numbers: AQI: <integer 20-500> | PM25: <integer 5-350> | PM10: <integer 10-480> | MAIN: <PM2.5 or PM10 or NO2> | TIP: <1 short plain-English apartment tip max 18 words>`,
        config: {
          abortSignal: AbortSignal.timeout(10000),
          tools: [{ googleSearch: {} }],
        },
      });
      const raw = (response.text ?? '').trim();
      const aqiMatch = raw.match(/AQI:\s*(\d{2,3})/i) ?? raw.match(/\b(\d{2,3})\b/);
      if (aqiMatch) {
        const aqi = Math.max(20, Math.min(500, Number(aqiMatch[1])));
        const fallbackPm = estimatePmFromAqi(aqi);
        const pm25Match = raw.match(/PM25:\s*(\d{1,3})/i);
        const pm10Match = raw.match(/PM10:\s*(\d{1,3})/i);
        const pm25 = pm25Match ? Math.max(5, Math.min(400, Number(pm25Match[1]))) : fallbackPm.pm25;
        const pm10 = pm10Match ? Math.max(10, Math.min(500, Number(pm10Match[1]))) : fallbackPm.pm10;
        const mainMatch = raw.match(/MAIN:\s*([A-Za-z0-9._-]+)/i);
        const tipMatch = raw.match(/TIP:\s*(.+)$/i);
        const band = classifyLocalAqiBand(aqi);
        return {
          aqi,
          pm25,
          pm10,
          scaleLabel: 'Live Web AQI Grounding',
          category: band.shortLabel,
          dominantPollutant: mainMatch ? mainMatch[1].toUpperCase() : 'PM2.5',
          healthTip: tipMatch ? tipMatch[1].trim() : band.actionTip,
          severity: band.severity,
          checkedAt,
          hourlyTrend: buildDiurnalPollutionTrend(aqi, pm25),
          weeklyTrend: buildWeeklyPollutionTrend(aqi, pm25),
        };
      }
    } catch {
      // Fall through to regional winter baseline below
    }
  }

  // Deterministic regional baseline if both Air Quality API (403 on demo key) and search unavailable
  const lower = target.toLowerCase();
  const isNorthWinterBelt =
    /(delhi|gurugram|gurgaon|noida|ghaziabad|faridabad|ncr|lucknow|kanpur|patna|chandigarh|jaipur)/i.test(
      lower
    ) ||
    (lat >= 26 && lat <= 31 && lng >= 74 && lng <= 86);
  const fallbackAqi = isNorthWinterBelt ? 218 : 112;
  const fallbackPm = estimatePmFromAqi(fallbackAqi);
  const band = classifyLocalAqiBand(fallbackAqi);
  return {
    aqi: fallbackAqi,
    pm25: fallbackPm.pm25,
    pm10: fallbackPm.pm10,
    scaleLabel: 'Regional Winter Estimate',
    category: band.shortLabel,
    dominantPollutant: 'PM2.5',
    healthTip: band.actionTip,
    severity: band.severity,
    checkedAt,
    hourlyTrend: buildDiurnalPollutionTrend(fallbackAqi, fallbackPm.pm25),
    weeklyTrend: buildWeeklyPollutionTrend(fallbackAqi, fallbackPm.pm25),
  };
}

async function fetchLocalAirQuality(
  lat: number,
  lng: number,
  apiKey: string,
  locationLabel = ''
) {
  const url = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${encodeURIComponent(apiKey)}`;
  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Maps-Solution-ID': GMP_ATTRIBUTION_HEADER,
    },
    body: JSON.stringify({
      universalAqi: true,
      location: { latitude: lat, longitude: lng },
      extraComputations: [
        'LOCAL_AQI',
        'HEALTH_RECOMMENDATIONS',
        'POLLUTANT_CONCENTRATION',
      ],
      languageCode: 'en',
    }),
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    const quotaExceeded = isQuotaExhaustedPayload(upstream.status, text);
    if (quotaExceeded) {
      return {
        ok: false as const,
        status: 429,
        quotaExceeded: true,
        error: 'Google Maps Platform quota reached for Air Quality lookup.',
      };
    }

    // Air Quality API can return 403 PERMISSION_DENIED on free Demo Key projects;
    // gracefully ground live AQI via Gemini Search instead of failing the user.
    if (upstream.status === 403) {
      const grounded = await fetchSearchGroundedAirQuality(locationLabel, lat, lng);
      return { ok: true as const, reading: grounded };
    }

    return {
      ok: false as const,
      status: upstream.status,
      quotaExceeded: false,
      error: `Air Quality lookup unavailable (status ${upstream.status}).`,
    };
  }

  const parsed = JSON.parse(text);
  const reading = normalizeGoogleAirQualityResponse(parsed);
  return { ok: true as const, reading };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '128kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'lofty-air-lab' });
  });

  app.get('/api/maps-config', (_req, res) => {
    const apiKey = getGoogleMapsApiKey();
    res.json({
      configured: Boolean(apiKey),
      apiKey: apiKey ?? '',
    });
  });

  app.post('/api/geocode', async (req, res) => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      return res.status(503).json({
        error: 'Google Maps API key is not configured on the server yet.',
      });
    }

    const body = req.body ?? {};
    const address = typeof body.address === 'string' ? body.address.trim().slice(0, 200) : '';
    const hasCoords =
      typeof body.lat === 'number' &&
      typeof body.lng === 'number' &&
      Number.isFinite(body.lat) &&
      Number.isFinite(body.lng);

    if (!address && !hasCoords) {
      return res.status(400).json({ error: 'Provide an address string or lat/lng coordinates.' });
    }

    try {
      let url: string;
      if (hasCoords) {
        const u = new URL('https://geocode.googleapis.com/v4/geocode/location');
        u.searchParams.set('location.latitude', String(body.lat));
        u.searchParams.set('location.longitude', String(body.lng));
        u.searchParams.set('languageCode', 'en');
        url = u.toString();
      } else {
        const u = new URL(
          `https://geocode.googleapis.com/v4/geocode/address/${encodeURIComponent(address)}`
        );
        u.searchParams.set('languageCode', 'en');
        u.searchParams.set('regionCode', 'in');
        url = u.toString();
      }

      const upstream = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'results.placeId,results.location,results.formattedAddress',
          'X-Goog-Maps-Solution-ID': GMP_ATTRIBUTION_HEADER,
        },
      });

      const text = await upstream.text();
      if (!upstream.ok) {
        const quotaExceeded = isQuotaExhaustedPayload(upstream.status, text);
        return res.status(quotaExceeded ? 429 : 502).json({
          quotaExceeded,
          error: quotaExceeded
            ? 'Google Maps Platform quota reached while finding that location.'
            : `Could not resolve that location right now (status ${upstream.status}).`,
        });
      }

      const data = JSON.parse(text);
      const first = data?.results?.[0];
      if (!first || typeof first.location?.latitude !== 'number') {
        return res.status(404).json({
          error: 'Could not match that address. Try a nearby sector, metro station, or city name.',
        });
      }

      return res.json({
        placeId: first.placeId || '',
        formattedAddress: first.formattedAddress || address || 'Selected Location',
        lat: first.location.latitude,
        lng: first.location.longitude,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      return res.status(502).json({ error: `Location lookup failed (${msg}).` });
    }
  });

  app.post('/api/air-quality', async (req, res) => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      return res.status(503).json({
        error: 'Google Maps API key is not configured on the server yet.',
      });
    }

    const body = req.body ?? {};
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    const locationLabel = typeof body.locationLabel === 'string' ? body.locationLabel.slice(0, 140) : '';
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Valid latitude and longitude coordinates are required.' });
    }

    try {
      const result = await fetchLocalAirQuality(lat, lng, apiKey, locationLabel);
      if (!result.ok) {
        return res.status(result.status).json({
          quotaExceeded: result.quotaExceeded,
          error: result.error,
        });
      }
      return res.json(result.reading);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      return res.status(502).json({ error: `Air quality check failed (${msg}).` });
    }
  });

  const KNOWN_INDIAN_CITIES: CitySuggestion[] = [
    { name: 'Hyderabad', admin1: 'Telangana', country: 'India', lat: 17.385, lng: 78.4867, label: 'Hyderabad, Telangana' },
    { name: 'Delhi', admin1: 'Delhi', country: 'India', lat: 28.6139, lng: 77.209, label: 'Delhi, NCR' },
    { name: 'Bengaluru', admin1: 'Karnataka', country: 'India', lat: 12.9716, lng: 77.5946, label: 'Bengaluru, Karnataka' },
    { name: 'Gurugram', admin1: 'Haryana', country: 'India', lat: 28.4595, lng: 77.0266, label: 'Gurugram, Haryana' },
    { name: 'Mumbai', admin1: 'Maharashtra', country: 'India', lat: 19.076, lng: 72.8777, label: 'Mumbai, Maharashtra' },
    { name: 'Noida', admin1: 'Uttar Pradesh', country: 'India', lat: 28.5355, lng: 77.391, label: 'Noida, Uttar Pradesh' },
    { name: 'Chennai', admin1: 'Tamil Nadu', country: 'India', lat: 13.0827, lng: 80.2707, label: 'Chennai, Tamil Nadu' },
    { name: 'Pune', admin1: 'Maharashtra', country: 'India', lat: 18.5204, lng: 73.8567, label: 'Pune, Maharashtra' },
    { name: 'Kolkata', admin1: 'West Bengal', country: 'India', lat: 22.5726, lng: 88.3639, label: 'Kolkata, West Bengal' },
    { name: 'Ahmedabad', admin1: 'Gujarat', country: 'India', lat: 23.0225, lng: 72.5714, label: 'Ahmedabad, Gujarat' },
    { name: 'Jaipur', admin1: 'Rajasthan', country: 'India', lat: 26.9124, lng: 75.7873, label: 'Jaipur, Rajasthan' },
    { name: 'Lucknow', admin1: 'Uttar Pradesh', country: 'India', lat: 26.8467, lng: 80.9462, label: 'Lucknow, Uttar Pradesh' },
  ];

  function levenshtein(a: string, b: string): number {
    const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
    for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;
    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[a.length][b.length];
  }

  app.get('/api/city-search', async (req, res) => {
    const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 120) : '';
    if (rawQuery.length < 2) {
      return res.status(400).json({ error: 'Type at least 2 characters for a city name.' });
    }

    const fetchOpenMeteoGeo = async (name: string): Promise<CitySuggestion[]> => {
      const u = new URL('https://geocoding-api.open-meteo.com/v1/search');
      u.searchParams.set('name', name);
      u.searchParams.set('count', '6');
      u.searchParams.set('language', 'en');
      u.searchParams.set('format', 'json');
      const upstream = await fetch(u.toString(), { signal: AbortSignal.timeout(7000) });
      if (!upstream.ok) return [];
      const data = await upstream.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      return results.map((r: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }) => ({
        name: r.name,
        admin1: r.admin1,
        country: r.country,
        lat: r.latitude,
        lng: r.longitude,
        label: [r.name, r.admin1, r.country].filter(Boolean).slice(0, 2).join(', '),
      }));
    };

    try {
      const results = await fetchOpenMeteoGeo(rawQuery);
      if (results.length > 0) {
        // Prefer exact/strong Indian match or top match
        const indianFirst =
          results.find((r) => r.country === 'India' && r.name.toLowerCase() === rawQuery.toLowerCase()) ??
          results.find((r) => r.country === 'India') ??
          results[0];

        return res.json({
          found: true,
          exactMatch: indianFirst,
          suggestions: results.slice(0, 4),
        });
      }

      // Unknown / typo city: try prefix search + Levenshtein closest Indian cities
      const prefixResults =
        rawQuery.length >= 4 ? await fetchOpenMeteoGeo(rawQuery.slice(0, Math.min(5, rawQuery.length - 1))) : [];
      const qLower = rawQuery.toLowerCase();
      const rankedLocal = KNOWN_INDIAN_CITIES.map((c) => ({
        city: c,
        dist: levenshtein(qLower, c.name.toLowerCase()),
      }))
        .sort((a, b) => a.dist - b.dist)
        .filter((x) => x.dist <= Math.max(4, Math.floor(qLower.length * 0.6)))
        .slice(0, 3)
        .map((x) => x.city);

      const merged: CitySuggestion[] = [];
      for (const item of [...prefixResults, ...rankedLocal, ...KNOWN_INDIAN_CITIES.slice(0, 3)]) {
        if (!merged.some((m) => m.name.toLowerCase() === item.name.toLowerCase())) {
          merged.push(item);
        }
        if (merged.length >= 3) break;
      }

      return res.json({
        found: false,
        exactMatch: null,
        suggestions: merged,
      });
    } catch {
      const qLower = rawQuery.toLowerCase();
      const directLocal = KNOWN_INDIAN_CITIES.find((c) => c.name.toLowerCase().includes(qLower));
      if (directLocal) {
        return res.json({ found: true, exactMatch: directLocal, suggestions: [directLocal] });
      }
      const fallbackSuggestions = KNOWN_INDIAN_CITIES.slice(0, 3);
      return res.json({ found: false, exactMatch: null, suggestions: fallbackSuggestions });
    }
  });

  app.post('/api/open-meteo-air', async (req, res) => {
    const body = req.body ?? {};
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Valid latitude and longitude coordinates are required.' });
    }

    try {
      const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
      url.searchParams.set('latitude', String(lat));
      url.searchParams.set('longitude', String(lng));
      url.searchParams.set('current', 'pm10,pm2_5,ozone,nitrogen_dioxide,us_aqi,european_aqi');
      url.searchParams.set('hourly', 'pm2_5,us_aqi');
      url.searchParams.set('past_days', '7');
      url.searchParams.set('forecast_days', '2');
      url.searchParams.set('timezone', 'Asia/Kolkata');

      const upstream = await fetch(url.toString(), { signal: AbortSignal.timeout(9000) });
      if (!upstream.ok) {
        return res.status(502).json({
          error: `Open-Meteo Air Quality returned status ${upstream.status}.`,
        });
      }

      const data = await upstream.json();
      const curr = data?.current ?? {};
      const pm25Raw = typeof curr.pm2_5 === 'number' && Number.isFinite(curr.pm2_5) ? Math.round(curr.pm2_5) : null;
      const pm10Raw = typeof curr.pm10 === 'number' && Number.isFinite(curr.pm10) ? Math.round(curr.pm10) : null;
      const o3Raw = typeof curr.ozone === 'number' && Number.isFinite(curr.ozone) ? Math.round(curr.ozone) : null;
      const no2Raw =
        typeof curr.nitrogen_dioxide === 'number' && Number.isFinite(curr.nitrogen_dioxide)
          ? Math.round(curr.nitrogen_dioxide)
          : null;
      const usAqiRaw = typeof curr.us_aqi === 'number' && Number.isFinite(curr.us_aqi) ? Math.round(curr.us_aqi) : null;

      const stationUnavailable = pm25Raw === null && pm10Raw === null && usAqiRaw === null;

      const hourlyTimes: string[] = Array.isArray(data?.hourly?.time) ? data.hourly.time : [];
      const hourlyPm25: Array<number | null> = Array.isArray(data?.hourly?.pm2_5) ? data.hourly.pm2_5 : [];
      const hourlyAqi: Array<number | null> = Array.isArray(data?.hourly?.us_aqi) ? data.hourly.us_aqi : [];

      // Locate index of current time in hourly arrays so forecast window covers next 24h
      const currTimePrefix = typeof curr.time === 'string' ? curr.time.slice(0, 13) : '';
      let nowIdx = hourlyTimes.findIndex((t) => typeof t === 'string' && t.startsWith(currTimePrefix));
      if (nowIdx < 0) {
        nowIdx = Math.max(0, hourlyTimes.length - 48);
      }

      const next24Times = hourlyTimes.slice(nowIdx, nowIdx + 24);
      const next24Pm25 = hourlyPm25.slice(nowIdx, nowIdx + 24);
      const next24Aqi = hourlyAqi.slice(nowIdx, nowIdx + 24);

      const cleanestWindow = findCleanestTwoHourWindow(next24Times, next24Pm25);
      const hourlyTrend = buildNext24HourCurve(next24Times, next24Pm25, next24Aqi, cleanestWindow.startHour);
      const weeklyTrend = buildWeeklyPm25TrendFromOpenMeteo(hourlyTimes, hourlyPm25, hourlyAqi);

      const badge = classifyOpenMeteoAqiBadge(pm25Raw, usAqiRaw);
      const resolvedAqi = usAqiRaw ?? (pm25Raw !== null ? Math.round(pm25Raw * 2.1) : 0);

      let dominantPollutant = 'PM2.5';
      if (pm10Raw !== null && pm25Raw !== null && pm10Raw > pm25Raw * 2.1) {
        dominantPollutant = 'PM10';
      } else if (o3Raw !== null && pm25Raw !== null && o3Raw > 120 && pm25Raw < 40) {
        dominantPollutant = 'O3';
      }

      const checkedAt = formatIstTimestamp(new Date());

      let resolvedCity =
        typeof body.locationLabel === 'string' &&
        body.locationLabel.trim().length > 1 &&
        !isCoordinateLabel(body.locationLabel)
          ? formatShortCityName(body.locationLabel, { lat, lng })
          : '';

      if (!resolvedCity) {
        try {
          const revUrl = new URL('https://nominatim.openstreetmap.org/reverse');
          revUrl.searchParams.set('format', 'jsonv2');
          revUrl.searchParams.set('lat', String(lat));
          revUrl.searchParams.set('lon', String(lng));
          revUrl.searchParams.set('zoom', '10');
          const revRes = await fetch(revUrl.toString(), {
            headers: { 'User-Agent': 'LoftyAirLab/1.0' },
            signal: AbortSignal.timeout(3500),
          });
          if (revRes.ok) {
            const revJson = await revRes.json();
            const addr = revJson?.address ?? {};
            const cand = addr.city || addr.town || addr.state_district || addr.county || addr.village;
            if (typeof cand === 'string' && cand.trim().length > 1) {
              resolvedCity = cand.trim();
            }
          }
        } catch {
          // Fall back to nearest known city
        }
      }

      if (!resolvedCity) {
        resolvedCity = resolveNearestKnownCity(lat, lng);
      }

      const reading: LocalAirReading = {
        aqi: resolvedAqi,
        pm25: pm25Raw,
        pm10: pm10Raw,
        o3: o3Raw,
        no2: no2Raw,
        scaleLabel: 'Open-Meteo Air Quality',
        source: 'Open-Meteo',
        resolvedCity,
        coords: { lat: Number(lat.toFixed(2)), lng: Number(lng.toFixed(2)) },
        updatedAtIso: new Date().toISOString(),
        category: stationUnavailable ? 'Unavailable' : badge.category,
        dominantPollutant,
        healthTip: cleanestWindow.note,
        severity: badge.severity,
        checkedAt,
        cleanestWindow,
        stationUnavailable,
        hourlyTrend,
        weeklyTrend,
      };

      return res.json(reading);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      return res.status(502).json({
        error: `Could not reach Open-Meteo Air Quality right now (${msg}).`,
      });
    }
  });

  app.post('/api/alerts', async (req, res) => {
    const body = req.body ?? {};
    const check = validateAlertSubscriptionInput(body);
    if (!check.valid || !check.sanitized) {
      return res.status(400).json({ error: check.error });
    }

    const id =
      typeof body.id === 'string' && body.id.trim().length > 0
        ? body.id.trim().slice(0, 64)
        : `alert-${Date.now()}`;
    const enabled = body.enabled !== false;

    const subscription: SmogAlertSubscription = {
      id,
      locationLabel: check.sanitized.locationLabel,
      placeId: typeof body.placeId === 'string' ? body.placeId.slice(0, 140) : undefined,
      lat: check.sanitized.lat,
      lng: check.sanitized.lng,
      thresholdAqi: check.sanitized.thresholdAqi,
      channel: check.sanitized.channel,
      pushPermission:
        body.pushPermission === 'granted' ||
        body.pushPermission === 'denied' ||
        body.pushPermission === 'default'
          ? body.pushPermission
          : 'unsupported',
      enabled,
      updatedAt: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
    };

    const apiKey = getGoogleMapsApiKey();
    let quotaExceeded = false;
    if (apiKey) {
      try {
        const aqiResult = await fetchLocalAirQuality(
          subscription.lat,
          subscription.lng,
          apiKey,
          subscription.locationLabel
        );
        if (aqiResult.ok) {
          subscription.lastReading = aqiResult.reading;
        } else if (aqiResult.quotaExceeded) {
          quotaExceeded = true;
        }
      } catch {
        // Non-fatal: subscription still saves cleanly
      }
    }

    alertSubscriptions.set(id, subscription);
    const shouldAlertNow = shouldTriggerSmogAlert(
      subscription.lastReading,
      subscription.thresholdAqi,
      subscription.enabled
    );

    return res.json({
      subscription,
      shouldAlertNow,
      quotaExceeded,
    });
  });

  app.post('/api/air-plan', async (req, res) => {
    const started = Date.now();
    const body = req.body ?? {};
    const location = typeof body.location === 'string' ? body.location.trim().slice(0, 120) : '';
    if (location.length < 2) {
      return res.status(400).json({
        error: 'Please enter your city, sector, or society area (at least 2 letters).',
      });
    }

    const smogSeverity = VALID_SEVERITIES.has(body.smogSeverity) ? body.smogSeverity : 'severe';
    const familyMode: FamilyMode = VALID_FAMILY_MODES.has(body.familyMode)
      ? (body.familyMode as FamilyMode)
      : 'all';
    const household = VALID_HOUSEHOLDS.has(body.household) ? body.household : 'family_kids';
    const heating = VALID_HEATING.has(body.heating) ? body.heating : 'gas_furnace';
    const commute = VALID_COMMUTES.has(body.commute) ? body.commute : 'gas_car';
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 480) : '';

    const ai = createGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please add it in Settings > Secrets.',
      });
    }

    const prompt = [
      `Build a simple, practical morning-to-evening clean-air daily plan tailored for an apartment/society household:`,
      `- City / Sector / Society: ${location}`,
      `- Outside Air Today: ${SEVERITY_TEXT[smogSeverity]}`,
      `- Active Family Focus Mode: ${FAMILY_MODE_TEXT[familyMode]}`,
      `- Flat & Family: ${HOUSEHOLD_TEXT[household]}`,
      `- Kitchen & Flat Setup: ${HEATING_TEXT[heating]}`,
      `- Daily Travel: ${COMMUTE_TEXT[commute]}`,
      notes ? `- Extra Flat Notes: ${notes}` : '- Extra Flat Notes: None provided',
      ``,
      `Important Style & Content Rules:`,
      `1. Write in warm, plain, everyday English easy for Indian apartment families to follow right away.`,
      `2. Fill outdoorActivityAdvice (safer outdoor activity timing + best hours), commuteAdvice (low-emission school/office travel tips), AND familyGuidance (distinct tailored advice for children, adults, and elderly residents).`,
      `3. Provide 3 concrete dailyRoutine items — 1 Morning, 1 Afternoon, and 1 Night — each with a concise one-line action, realistic weekly pollution cut in kg (0.5 to 8.0), and indoor dust & smoke reduction % (4 to 25).`,
      `4. Provide 4 easy indoorHacks covering distinct home spaces (Kids / Parents Bedroom, Living Room & Balcony, Kitchen & Cooking Area, Hallway & Entrance) using costTier strictly from ['Free', 'Under ₹500', 'DIY Under ₹2,000']. IMPORTANT: Do NOT include any "%" symbol inside impactMetric text—put the percentage ONLY in the numeric pm25ReductionPct field. For the DIY fan filter hack, explain clearly: "₹600 filter sheet + a fan you already own = ₹1,500 total, vs ₹15,000 for a purifier."`,
      `5. Provide 4 concrete sustainableSwaps ("insteadOf" -> "switchTo") across low-emission travel and household habits with realistic weekly pollution cut in kg (1.5 to 12.0), monthly savings in Indian Rupees (₹200 to ₹2500 as monthlySavingsInr), dust/smoke reduction %, and plain-language directImpactExplanation.`,
      `6. Ensure every item has a unique short kebab-case id.`,
    ].join('\n');

    try {
      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            abortSignal: AbortSignal.timeout(25000),
            systemInstruction:
              'You are Lofty Air Lab, a warm, human-friendly environmental intelligence coach for apartment families. Tailor daily schedules, indoor wellness hacks, and sustainable swaps to the selected Family Mode (Children, Adults, Elderly, or Whole Flat) and always explain the direct environmental and health impact clearly without scary jargon.',
            responseMimeType: 'application/json',
            responseSchema: airPlanSchema,
          },
        })
      );

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        return res.status(502).json({ error: 'Empty response received. Please try again.' });
      }

      const parsed = JSON.parse(rawText);
      console.log(`[/api/air-plan] Generated plan for "${location}" (${familyMode}) in ${Date.now() - started}ms`);
      return res.json({
        ...parsed,
        location,
        smogSeverity,
        familyMode,
        generatedAt: new Date().toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
        }),
        isBaseline: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to reach AI service';
      console.error(`[/api/air-plan] Gemini error after ${Date.now() - started}ms:`, message);
      return res.status(502).json({
        error: `Could not create your flat plan right now (${message}). Please try again.`,
      });
    }
  });

  app.post('/api/air-chat', async (req, res) => {
    const started = Date.now();
    const body = req.body ?? {};
    const question = typeof body.question === 'string' ? body.question.trim().slice(0, 600) : '';
    if (question.length < 2) {
      return res.status(400).json({ error: 'Please type a question with at least 2 characters.' });
    }

    const location = typeof body.location === 'string' ? body.location.trim().slice(0, 120) : 'Hyderabad, Telangana';
    const smogSeverity = VALID_SEVERITIES.has(body.smogSeverity) ? body.smogSeverity : 'sensitive';
    const familyMode: FamilyMode = VALID_FAMILY_MODES.has(body.familyMode)
      ? (body.familyMode as FamilyMode)
      : 'all';
    const language: ChatLanguage =
      body.language === 'hi' || body.language === 'te' ? body.language : 'en';
    const vc = body.verdictContext && typeof body.verdictContext === 'object' ? body.verdictContext : null;

    const liveAqi =
      typeof body.liveAqi === 'number' && Number.isFinite(body.liveAqi)
        ? Math.round(body.liveAqi)
        : null;
    const pm25 =
      typeof body.pm25 === 'number' && Number.isFinite(body.pm25) ? Math.round(body.pm25) : null;
    const pm10 =
      typeof body.pm10 === 'number' && Number.isFinite(body.pm10) ? Math.round(body.pm10) : null;
    const o3 =
      typeof vc?.o3 === 'number' && Number.isFinite(vc.o3) ? Math.round(vc.o3) : null;
    const no2 =
      typeof vc?.no2 === 'number' && Number.isFinite(vc.no2) ? Math.round(vc.no2) : null;
    const stationUnavailable = Boolean(vc?.stationUnavailable);

    const contextSummary =
      typeof body.contextSummary === 'string' ? body.contextSummary.trim().slice(0, 600) : '';

    const rawHistory: unknown[] = Array.isArray(body.history) ? body.history : [];
    const validTurns = rawHistory
      .filter(
        (turn: unknown): turn is { role: 'user' | 'assistant'; content: string } =>
          Boolean(
            turn &&
              typeof turn === 'object' &&
              ((turn as { role?: unknown }).role === 'user' ||
                (turn as { role?: unknown }).role === 'assistant') &&
              typeof (turn as { content?: unknown }).content === 'string' &&
              (turn as { content: string }).content.trim().length > 0
          )
      )
      .slice(-12);

    // Ensure history strictly alternates user -> model and ends with model
    // before appending the new user question via chat.sendMessage.
    const formattedHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const turn of validTurns) {
      const mappedRole = turn.role === 'assistant' ? ('model' as const) : ('user' as const);
      const expectedRole = formattedHistory.length % 2 === 0 ? 'user' : 'model';
      if (mappedRole !== expectedRole) {
        if (mappedRole === 'user' && formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
          formattedHistory[formattedHistory.length - 1] = {
            role: 'user',
            parts: [{ text: turn.content.trim().slice(0, 800) }],
          };
        }
        continue;
      }
      formattedHistory.push({
        role: mappedRole,
        parts: [{ text: turn.content.trim().slice(0, 800) }],
      });
    }
    if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
      formattedHistory.pop();
    }

    const ai = createGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please add it in Settings > Secrets.',
      });
    }

    const telemetryParts = [
      `City: ${location}`,
      stationUnavailable
        ? 'Station Status: NO LIVE READING AVAILABLE RIGHT NOW.'
        : [
            `Source: ${vc?.source || 'Open-Meteo'} (${vc?.updatedAt || 'recent'})`,
            liveAqi !== null ? `AQI: ${liveAqi} (${vc?.category || SEVERITY_TEXT[smogSeverity]})` : 'AQI: unavailable',
            pm25 !== null ? `PM2.5: ${pm25} µg/m³` : 'PM2.5: unavailable',
            pm10 !== null ? `PM10: ${pm10} µg/m³` : 'PM10: unavailable',
            o3 !== null ? `O3: ${o3} µg/m³` : 'O3: unavailable',
            no2 !== null ? `NO2: ${no2} µg/m³` : 'NO2: unavailable',
            vc?.verdict ? `Rule-Based Safety Verdict: ${vc.verdict}` : '',
            vc?.person ? `Who is going out: ${vc.person}` : '',
            vc?.activity ? `Planned activity: ${vc.activity}` : '',
            vc?.cleanestWindow ? `Cleanest 2h daylight window: ${vc.cleanestWindow}` : '',
          ]
            .filter(Boolean)
            .join(' | '),
    ].join(' | ');

    const languageRule =
      language === 'hi'
        ? 'Reply strictly in clear, conversational Hindi (Devanagari script).'
        : language === 'te'
          ? 'Reply strictly in clear, conversational Telugu (Telugu script).'
          : 'Reply strictly in plain, everyday English without scientific jargon.';

    const systemInstruction = [
      'You are "Ask about the air" — a helpful Urban Air Quality Assistant.',
      `FETCHED DATA CONTEXT (SOURCE OF TRUTH): ${telemetryParts}.`,
      `Active Family Mode: ${FAMILY_MODE_TEXT[familyMode]}.`,
      contextSummary ? `Extra flat notes: ${contextSummary}` : '',
      languageRule,
      'STRICT GROUNDING RULES:',
      '1. ONLY explain and cite the numbers explicitly listed in FETCHED DATA CONTEXT above. NEVER invent, estimate, or guess an AQI or pollutant value.',
      '2. If a requested number or station reading is "unavailable" or missing from context, clearly say "I don\'t know" (in the selected language, e.g., "I don\'t know — that reading is not available right now.").',
      '3. Keep every reply concise: strictly 2–3 short sentences total, friendly and practical.',
    ]
      .filter(Boolean)
      .join(' ');

    try {
      const modelConfigs: Array<{ model: string; thinkingLevel: ThinkingLevel }> = [
        { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW },
        { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
      ];
      let response: Awaited<ReturnType<ReturnType<typeof ai.chats.create>['sendMessage']>> | null =
        null;
      let lastErr: unknown = null;

      for (const cfg of modelConfigs) {
        try {
          const chat = ai.chats.create({
            model: cfg.model,
            history: formattedHistory,
            config: {
              abortSignal: AbortSignal.timeout(15000),
              systemInstruction,
              thinkingConfig: { thinkingLevel: cfg.thinkingLevel },
            },
          });
          response = await chat.sendMessage({ message: question });
          if (response && (response.text ?? '').trim().length > 0) break;
        } catch (err) {
          lastErr = err;
          console.warn(`[/api/air-chat] Model ${cfg.model} failed:`, err instanceof Error ? err.message : err);
        }
      }

      if (!response) {
        throw lastErr instanceof Error ? lastErr : new Error('All AI models busy');
      }

      const answer = (response.text ?? '').trim();
      if (!answer) {
        return res.status(502).json({ error: 'Assistant returned an empty answer. Please try again.' });
      }
      console.log(`[/api/air-chat] Answered multi-turn (${formattedHistory.length} prior turns) in ${Date.now() - started}ms`);
      return res.json({ answer });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to reach AI service';
      console.error(`[/api/air-chat] Gemini error after ${Date.now() - started}ms:`, message);
      return res.status(502).json({
        error: `Could not answer right now (${message}). Please try again.`,
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lofty Air Lab listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
