import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, BellRing, X } from 'lucide-react';
import type {
  AirPlannerInput,
  ChatLanguage,
  ChatTurn,
  CitySuggestion,
  FamilyMode,
  GeneratedAirPlan,
  LatLngPoint,
  LocalAirReading,
  PlanTabId,
  SmogAlertSubscription,
  VerdictActivity,
  VerdictPerson,
} from './types/air';
import {
  calculateAdoptedImpact,
  DEFAULT_BASELINE_PLAN,
  FAMILY_MODE_LABELS,
  formatPlanMarkdown,
  getAqiTierMeta,
  mergeHabitIntoNotes,
  VALID_FAMILY_MODES,
  validatePlannerInput,
} from './utils/airImpact';
import {
  buildDiurnalPollutionTrend,
  buildWeeklyPollutionTrend,
  classifyLocalAqiBand,
  estimatePmFromAqi,
  formatAlertBannerCopy,
  shouldTriggerSmogAlert,
} from './utils/alertLogic';
import {
  classifyOpenMeteoAqiBadge,
  computeSafetyVerdict,
  formatIstTimestamp,
  formatShortCityName,
  isCoordinateLabel,
  resolveNearestKnownCity,
} from './utils/verdictRules';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { AirIntelligenceSection } from './components/AirIntelligenceSection';
import { DailyPlanSection } from './components/DailyPlanSection';
import { IndoorWellnessSection } from './components/IndoorWellnessSection';
import { SustainableLivingSection } from './components/SustainableLivingSection';
import { AskChatbotSection } from './components/AskChatbotSection';
import { ImpactAndStoriesSection } from './components/ImpactAndStoriesSection';
import { MenuDrawer } from './components/MenuDrawer';
import { SmogAlertModal } from './components/SmogAlertModal';

const STORAGE_KEYS = {
  input: 'lofty_air_lab_input_v4',
  plan: 'lofty_air_lab_plan_v5',
  adopted: 'lofty_air_lab_adopted_v5',
  alert: 'lofty_air_lab_alert_v1',
  familyMode: 'lofty_air_lab_family_mode_v1',
  locationLabel: 'lofty_air_lab_live_location_v2',
  coords: 'lofty_air_lab_live_coords_v2',
  airCache: 'lofty_air_lab_openmeteo_cache_v1',
  chatLang: 'lofty_air_lab_chat_lang_v1',
};

const PLAN_TABS: Array<{ id: PlanTabId; label: string }> = [
  { id: 'daily-plan', label: 'My Daily Plan' },
  { id: 'indoor-wellness', label: 'Indoor Wellness' },
  { id: 'sustainable-living', label: 'Sustainable Living' },
  { id: 'ask-chatbot', label: 'Ask About the Air' },
];

const DEFAULT_COORDS: LatLngPoint = { lat: 17.39, lng: 78.49 };
const DEFAULT_CITY_LABEL = 'Hyderabad';

const INITIAL_INPUT: AirPlannerInput = {
  location: DEFAULT_CITY_LABEL,
  smogSeverity: 'sensitive',
  familyMode: 'all',
  household: 'family_kids',
  heating: 'gas_furnace',
  commute: 'gas_car',
  notes: 'High-rise flat, morning school run, evening walk in society',
};

const INITIAL_LIVE_READING: LocalAirReading = {
  aqi: 103,
  pm25: 37,
  pm10: 37,
  o3: 83,
  no2: 12,
  scaleLabel: 'Open-Meteo Air Quality',
  source: 'Open-Meteo',
  resolvedCity: 'Hyderabad',
  coords: DEFAULT_COORDS,
  category: 'Poor',
  dominantPollutant: 'PM2.5',
  healthTip: 'Cleanest daylight stretch in the next 24h (3–5 PM).',
  severity: 'sensitive',
  checkedAt: formatIstTimestamp(new Date()),
  cleanestWindow: {
    windowLabel: '3–5 PM',
    startHour: '3 PM',
    endHour: '5 PM',
    avgPm25: 34,
    note: 'Cleanest daylight stretch in the next 24h (avg PM2.5 34).',
  },
  hourlyTrend: buildDiurnalPollutionTrend(103, 37),
  weeklyTrend: buildWeeklyPollutionTrend(103, 37),
};

function readStorage<T>(key: string, fallback: T, validate?: (val: unknown) => boolean): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [familyMode, setFamilyMode] = useState<FamilyMode>(() =>
    readStorage<FamilyMode>(
      STORAGE_KEYS.familyMode,
      'all',
      (val) => typeof val === 'string' && VALID_FAMILY_MODES.includes(val as FamilyMode)
    )
  );

  const [verdictPerson, setVerdictPerson] = useState<VerdictPerson>('adult');
  const [verdictActivity, setVerdictActivity] = useState<VerdictActivity>('walk');
  const [chatLanguage, setChatLanguage] = useState<ChatLanguage>(() =>
    readStorage<ChatLanguage>(
      STORAGE_KEYS.chatLang,
      'en',
      (val) => val === 'en' || val === 'hi' || val === 'te'
    )
  );

  const [input, setInput] = useState<AirPlannerInput>(() =>
    readStorage<AirPlannerInput>(STORAGE_KEYS.input, INITIAL_INPUT)
  );

  const [plan, setPlan] = useState<GeneratedAirPlan>(() =>
    readStorage<GeneratedAirPlan>(
      STORAGE_KEYS.plan,
      DEFAULT_BASELINE_PLAN,
      (val) =>
        Boolean(
          val &&
            typeof val === 'object' &&
            typeof (val as GeneratedAirPlan).outdoorActivityAdvice === 'string' &&
            typeof (val as GeneratedAirPlan).commuteAdvice === 'string' &&
            (val as GeneratedAirPlan).familyGuidance &&
            Array.isArray((val as GeneratedAirPlan).dailyRoutine) &&
            (val as GeneratedAirPlan).dailyRoutine.length === 3 &&
            Array.isArray((val as GeneratedAirPlan).sustainableSwaps) &&
            (val as GeneratedAirPlan).sustainableSwaps.every(
              (s) => typeof s.monthlySavingsInr === 'number'
            )
        )
    )
  );

  const [adoptedIds, setAdoptedIds] = useState<string[]>(() =>
    readStorage<string[]>(STORAGE_KEYS.adopted, ['routine-morning', 'hack-diy-fan-filter'])
  );

  const [liveLocationLabel, setLiveLocationLabel] = useState<string>(() =>
    readStorage<string>(
      STORAGE_KEYS.locationLabel,
      DEFAULT_CITY_LABEL,
      (val) => typeof val === 'string' && val.trim().length >= 2 && !isCoordinateLabel(val)
    )
  );
  const [liveCoords, setLiveCoords] = useState<LatLngPoint>(() =>
    readStorage<LatLngPoint>(
      STORAGE_KEYS.coords,
      DEFAULT_COORDS,
      (val) =>
        Boolean(
          val &&
            typeof (val as LatLngPoint).lat === 'number' &&
            typeof (val as LatLngPoint).lng === 'number'
        )
    )
  );
  const [liveReading, setLiveReading] = useState<LocalAirReading>(INITIAL_LIVE_READING);
  const [isLoadingReading, setIsLoadingReading] = useState(false);
  const [readingError, setReadingError] = useState<string | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);

  const [alertSubscription, setAlertSubscription] = useState<SmogAlertSubscription | null>(() =>
    readStorage<SmogAlertSubscription | null>(STORAGE_KEYS.alert, null)
  );
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [activeSmogBanner, setActiveSmogBanner] = useState<{ title: string; body: string } | null>(
    null
  );

  const [mapsApiKey, setMapsApiKey] = useState<string>(
    () => (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || ''
  );
  const [mapsConfigured, setMapsConfigured] = useState<boolean>(
    () => Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
  );
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [formValidationError, setFormValidationError] = useState<string | null>(null);

  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [activePlanTab, setActivePlanTab] = useState<PlanTabId>('daily-plan');
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const onQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  useEffect(() => {
    if (mapsApiKey) {
      setMapsConfigured(true);
      return;
    }
    let cancelled = false;
    fetch('/api/maps-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.apiKey) {
          setMapsApiKey(data.apiKey);
          setMapsConfigured(true);
        }
      })
      .catch(() => {
        // Ignore config lookup failure
      });
    return () => {
      cancelled = true;
    };
  }, [mapsApiKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.familyMode, JSON.stringify(familyMode));
    } catch {
      // Ignore storage quota
    }
  }, [familyMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.chatLang, JSON.stringify(chatLanguage));
    } catch {
      // Ignore storage quota
    }
  }, [chatLanguage]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.locationLabel, JSON.stringify(liveLocationLabel));
      window.localStorage.setItem(STORAGE_KEYS.coords, JSON.stringify(liveCoords));
    } catch {
      // Ignore storage quota
    }
  }, [liveLocationLabel, liveCoords]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.input, JSON.stringify(input));
    } catch {
      // Ignore storage quota
    }
  }, [input]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.plan, JSON.stringify(plan));
    } catch {
      // Ignore storage quota
    }
  }, [plan]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.adopted, JSON.stringify(adoptedIds));
    } catch {
      // Ignore storage quota
    }
  }, [adoptedIds]);

  useEffect(() => {
    try {
      if (alertSubscription) {
        window.localStorage.setItem(STORAGE_KEYS.alert, JSON.stringify(alertSubscription));
      } else {
        window.localStorage.removeItem(STORAGE_KEYS.alert);
      }
    } catch {
      // Ignore storage quota
    }
  }, [alertSubscription]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 2800);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  const applyResolvedAirLocation = useCallback(
    (label: string, lat: number, lng: number, reading: LocalAirReading) => {
      const cleanLabel = !isCoordinateLabel(label) && label.trim().length > 1
        ? formatShortCityName(label, { lat, lng })
        : formatShortCityName(reading.resolvedCity, { lat, lng });

      const roundedReading: LocalAirReading = {
        ...reading,
        resolvedCity: cleanLabel,
        coords: reading.coords ?? { lat: Number(lat.toFixed(2)), lng: Number(lng.toFixed(2)) },
      };
      const windowStr = roundedReading.cleanestWindow?.windowLabel || '3–5 PM';

      setLiveLocationLabel(cleanLabel);
      setLiveCoords({ lat, lng });
      setLiveReading(roundedReading);
      setInput((prev) => ({
        ...prev,
        location: cleanLabel,
        smogSeverity: roundedReading.severity,
      }));
      setPlan((prev) => {
        if (!prev.isBaseline) return prev;
        return {
          ...prev,
          location: cleanLabel,
          smogSeverity: roundedReading.severity,
          bestVentilationWindow: `${windowStr} (open opposite balcony doors briefly when afternoon sun lifts the haze; keep shut after evening traffic begins).`,
          outdoorActivityAdvice: `Shift kids’ society park play and elderly walks to ${windowStr}; avoid brisk running near main roads before 10 AM.`,
        };
      });
      try {
        const cache = readStorage<Record<string, { label: string; reading: LocalAirReading }>>(
          STORAGE_KEYS.airCache,
          {}
        );
        cache[cleanLabel.toLowerCase()] = { label: cleanLabel, reading: roundedReading };
        cache.__latest = { label: cleanLabel, reading: roundedReading };
        window.localStorage.setItem(STORAGE_KEYS.airCache, JSON.stringify(cache));
      } catch {
        // Ignore storage quota
      }
    },
    []
  );

  const fetchOpenMeteoForLocation = useCallback(
    async (lat: number, lng: number, label: string, silent = false) => {
      setIsLoadingReading(true);
      setReadingError(null);
      setCitySuggestions([]);

      try {
        const res = await fetch('/api/open-meteo-air', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng, locationLabel: label }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Open-Meteo Air Quality request failed.');
        }

        const freshReading: LocalAirReading = {
          ...(data as LocalAirReading),
          isCached: false,
        };
        const resolvedName =
          label && !isCoordinateLabel(label)
            ? formatShortCityName(label, { lat, lng })
            : freshReading.resolvedCity || resolveNearestKnownCity(lat, lng);
        applyResolvedAirLocation(resolvedName, lat, lng, freshReading);

        if (alertSubscription?.enabled) {
          setAlertSubscription((prev) => (prev ? { ...prev, lastReading: freshReading } : prev));
          if (shouldTriggerSmogAlert(freshReading, alertSubscription.thresholdAqi, true)) {
            const copy = formatAlertBannerCopy(alertSubscription, freshReading);
            setActiveSmogBanner(copy);
          }
        }

        if (!silent) {
          showToast(
            freshReading.stationUnavailable
              ? `No station reading nearby for ${resolvedName}`
              : `Open-Meteo live AQI ${freshReading.aqi} loaded for ${resolvedName}`
          );
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Unable to reach Open-Meteo right now.';
        const cache = readStorage<Record<string, { label: string; reading: LocalAirReading }>>(
          STORAGE_KEYS.airCache,
          {}
        );
        const cachedEntry = cache[label.toLowerCase()] ?? cache.__latest;
        if (cachedEntry?.reading) {
          setLiveLocationLabel(formatShortCityName(cachedEntry.label, { lat, lng }));
          setLiveReading({
            ...cachedEntry.reading,
            isCached: true,
            cachedTimestamp: cachedEntry.reading.checkedAt,
          });
        }
        setReadingError(msg);
      } finally {
        setIsLoadingReading(false);
      }
    },
    [alertSubscription, applyResolvedAirLocation]
  );

  // Fetch live Open-Meteo data on initial mount (default Hyderabad or saved location)
  useEffect(() => {
    const safeLabel = isCoordinateLabel(liveLocationLabel)
      ? resolveNearestKnownCity(liveCoords.lat, liveCoords.lng)
      : formatShortCityName(liveLocationLabel, liveCoords);
    void fetchOpenMeteoForLocation(liveCoords.lat, liveCoords.lng, safeLabel, true);
    // Intentionally run once on startup for initial location
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLookupCoords = async (lat: number, lng: number, labelHint?: string) => {
    const label = labelHint && !isCoordinateLabel(labelHint) ? labelHint.trim() : '';
    await fetchOpenMeteoForLocation(lat, lng, label, false);
  };

  const handleLookupCity = async (query: string) => {
    setReadingError(null);
    setCitySuggestions([]);
    setIsLoadingReading(true);

    try {
      const geoRes = await fetch(`/api/city-search?q=${encodeURIComponent(query)}`);
      const geoData = await geoRes.json();
      if (!geoRes.ok) {
        throw new Error(geoData?.error || 'Could not search that city.');
      }

      if (geoData.found && geoData.exactMatch) {
        await fetchOpenMeteoForLocation(
          geoData.exactMatch.lat,
          geoData.exactMatch.lng,
          geoData.exactMatch.label,
          false
        );
        return;
      }

      // Unknown city: show closest match suggestions cleanly
      setIsLoadingReading(false);
      if (Array.isArray(geoData.suggestions) && geoData.suggestions.length > 0) {
        setCitySuggestions(geoData.suggestions);
        showToast(`No exact match for "${query}" — pick a nearby suggestion.`);
      } else {
        setReadingError(`No matching city found for "${query}". Try Hyderabad, Delhi, or Bengaluru.`);
      }
    } catch (err) {
      setIsLoadingReading(false);
      const msg = err instanceof Error ? err.message : 'Unable to search city right now.';
      setReadingError(msg);
    }
  };

  const handleRetryFetch = async () => {
    await fetchOpenMeteoForLocation(liveCoords.lat, liveCoords.lng, liveLocationLabel, false);
  };

  const handleChangeFamilyMode = (mode: FamilyMode) => {
    setFamilyMode(mode);
    setInput((prev) => ({ ...prev, familyMode: mode }));
    if (mode === 'children') setVerdictPerson('child');
    else if (mode === 'elderly') setVerdictPerson('elderly');
    else if (mode === 'adults') setVerdictPerson('adult');
    showToast(`Switched Family Mode to ${FAMILY_MODE_LABELS[mode].label}`);
  };

  const handleChangePerson = (person: VerdictPerson) => {
    setVerdictPerson(person);
    if (person === 'child') setFamilyMode('children');
    else if (person === 'elderly') setFamilyMode('elderly');
    else if (person === 'adult') setFamilyMode('adults');
  };

  const impact = useMemo(() => calculateAdoptedImpact(plan, adoptedIds), [plan, adoptedIds]);
  const aqiMeta = useMemo(() => getAqiTierMeta(liveReading.severity), [liveReading.severity]);
  const badge = useMemo(
    () => classifyOpenMeteoAqiBadge(liveReading.pm25, liveReading.aqi),
    [liveReading.aqi, liveReading.pm25]
  );
  const currentVerdict = useMemo(
    () =>
      computeSafetyVerdict({
        pm25: liveReading.pm25,
        aqi: liveReading.aqi,
        person: verdictPerson,
        activity: verdictActivity,
        stationUnavailable: liveReading.stationUnavailable,
      }),
    [liveReading.aqi, liveReading.pm25, liveReading.stationUnavailable, verdictActivity, verdictPerson]
  );

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const navigateToSection = (target: 'air-intelligence' | PlanTabId) => {
    if (target === 'air-intelligence') {
      scrollToSection('air-intelligence');
      return;
    }
    setActivePlanTab(target);
    scrollToSection('your-plan');
  };

  const triggerBrowserPushIfAllowed = (title: string, body: string) => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted'
    ) {
      try {
        new window.Notification(title, { body });
      } catch {
        // Fallback already shown via banner
      }
    }
  };

  const handleSaveAlertSubscription = (
    subscription: SmogAlertSubscription,
    triggerBanner: boolean
  ) => {
    setAlertSubscription(subscription);
    setAlertModalOpen(false);
    if (subscription.lastReading) {
      applyResolvedAirLocation(
        subscription.locationLabel,
        subscription.lat,
        subscription.lng,
        subscription.lastReading
      );
    }
    if (triggerBanner && subscription.lastReading) {
      const copy = formatAlertBannerCopy(subscription, subscription.lastReading);
      setActiveSmogBanner(copy);
      if (subscription.channel === 'browser_push') {
        triggerBrowserPushIfAllowed(copy.title, copy.body);
      }
    }
    showToast(`Smog alerts enabled for ${subscription.locationLabel} (AQI ${subscription.thresholdAqi}+)`);
  };

  const handleDisableAlertSubscription = () => {
    setAlertSubscription(null);
    setActiveSmogBanner(null);
    setAlertModalOpen(false);
    showToast('Turned off local smog alerts');
  };

  const handleTestAlert = (
    subscription: SmogAlertSubscription,
    reading: LocalAirReading | null
  ) => {
    const simulatedPm = estimatePmFromAqi(Math.max(subscription.thresholdAqi + 35, 215));
    const simulatedReading: LocalAirReading = reading ?? {
      aqi: Math.max(subscription.thresholdAqi + 35, 215),
      pm25: simulatedPm.pm25,
      pm10: simulatedPm.pm10,
      scaleLabel: 'Local AQI Preview',
      category: 'Severe',
      dominantPollutant: 'PM2.5',
      healthTip:
        'Shut balcony sliders, run kitchen chimney before cooking, and turn on bedroom DIY fan filter.',
      severity: 'hazardous',
      checkedAt: formatIstTimestamp(new Date()),
    };
    const copy = formatAlertBannerCopy(subscription, simulatedReading);
    setActiveSmogBanner(copy);
    if (subscription.channel === 'browser_push') {
      triggerBrowserPushIfAllowed(copy.title, copy.body);
    }
  };

  const handleGeneratePlan = async (e: FormEvent) => {
    e.preventDefault();
    setPlanError(null);
    const validation = validatePlannerInput({ ...input, familyMode });
    if (!validation.valid || !validation.sanitized) {
      setFormValidationError(validation.error || 'Please check your flat details.');
      return;
    }

    setFormValidationError(null);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/air-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.sanitized),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not create your flat plan right now.');
      }

      setPlan(data as GeneratedAirPlan);
      const firstId = (data as GeneratedAirPlan).dailyRoutine?.[0]?.id;
      setAdoptedIds(firstId ? [firstId] : []);
      showToast(`Custom daily routine ready for ${validation.sanitized.location}`);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not connect right now. Please try again.';
      setPlanError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleAdopt = (itemId: string) => {
    setAdoptedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleResetAdoption = () => {
    setAdoptedIds([]);
    showToast('Cleared checked habits');
  };

  const handleExportPlan = () => {
    const markdown = formatPlanMarkdown(plan, adoptedIds);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `lofty-flat-plan-${plan.location.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast('Saved flat clean-air checklist (.md)');
  };

  const handleSendChat = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    setChatError(null);

    const priorTurns = chatHistory.map((t) => ({ role: t.role, content: t.content }));

    const userTurn: ChatTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: formatIstTimestamp(new Date()),
    };

    setChatHistory((prev) => [...prev, userTurn]);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/air-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          question: trimmed,
          history: priorTurns,
          location: liveLocationLabel || plan.location,
          smogSeverity: liveReading.severity || plan.smogSeverity,
          familyMode,
          language: chatLanguage,
          liveAqi: liveReading.stationUnavailable ? null : liveReading.aqi,
          pm25: liveReading.stationUnavailable ? null : liveReading.pm25 ?? null,
          pm10: liveReading.stationUnavailable ? null : liveReading.pm10 ?? null,
          verdictContext: {
            source: liveReading.source || 'Open-Meteo',
            updatedAt: liveReading.checkedAt,
            category: badge.category,
            o3: liveReading.o3 ?? null,
            no2: liveReading.no2 ?? null,
            verdict: currentVerdict.verdict,
            person: verdictPerson,
            activity: verdictActivity,
            cleanestWindow: liveReading.cleanestWindow?.windowLabel || '',
            stationUnavailable: Boolean(liveReading.stationUnavailable),
          },
          contextSummary: `${plan.airAdvisory} Habits checked: ${impact.adoptedCount}/${impact.totalSelectableCount}.`,
        }),
      });
      const rawText = await response.text();
      let data: { answer?: string; error?: string } = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        // Non-JSON proxy/server error
      }
      if (!response.ok || !data.answer) {
        throw new Error(data.error || `Could not answer right now (status ${response.status}).`);
      }

      const assistantTurn: ChatTurn = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        timestamp: formatIstTimestamp(new Date()),
      };
      setChatHistory((prev) => [...prev, assistantTurn]);
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'TimeoutError'
          ? 'The assistant took too long to reply. Please try sending your question again.'
          : err instanceof Error
            ? err.message
            : 'Unable to reach assistant.';
      setChatError(msg);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatHistory([]);
    setChatError(null);
  };

  const handleApplyPreset = (preset: AirPlannerInput, title: string) => {
    setInput({ ...preset, familyMode });
    setFormValidationError(null);
    navigateToSection('daily-plan');
    showToast(`Loaded "${title}" — click Generate My Daily Plan to customize!`);
  };

  const handleAddFocusHint = (hint: string) => {
    setInput((prev) => ({
      ...prev,
      notes: mergeHabitIntoNotes(prev.notes, hint),
    }));
    navigateToSection('daily-plan');
    showToast(`Pinned "${hint}" to your daily plan setup`);
  };

  const liveBand = classifyLocalAqiBand(liveReading.aqi);

  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#111111]">
      {gmpQuotaExceeded && (
        <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-900 shadow-sm md:text-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-amber-950 underline hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {activeSmogBanner && (
        <div
          role="alert"
          data-testid="extreme-smog-banner"
          className="border-b-2 border-[#111111] bg-[#FF66B3] px-4 py-3 text-[#111111]"
        >
          <div className="mx-auto flex max-w-[1320px] items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs sm:text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#111111]" aria-hidden="true" />
              <div>
                <strong className="font-extrabold">{activeSmogBanner.title}: </strong>
                <span className="font-semibold">{activeSmogBanner.body}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setAlertModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border-2 border-[#111111] bg-[#FFE14D] px-3 py-1 text-xs font-extrabold text-[#111111] hover:bg-white"
              >
                <BellRing className="h-3 w-3" aria-hidden="true" />
                <span>Settings</span>
              </button>
              <button
                type="button"
                aria-label="Dismiss smog alert banner"
                onClick={() => setActiveSmogBanner(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#111111] bg-white text-[#111111] hover:bg-[#FFE14D]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:border-2 focus:border-[#111111] focus:bg-[#FFE14D] focus:px-4 focus:py-2 focus:text-xs focus:font-extrabold focus:text-[#111111]"
      >
        Skip to main content
      </a>

      <Navbar onOpenMenu={() => setMenuOpen(true)} onNavigateSection={navigateToSection} />

      <main id="main-content">
        <HeroSection
          clarity={impact.skyClarityScore}
          hazeLevel={aqiMeta.hazeLevel}
          liveReading={liveReading}
          liveCoords={liveCoords}
          liveLocationLabel={liveLocationLabel}
          familyMode={familyMode}
          verdictPerson={verdictPerson}
          verdictActivity={verdictActivity}
          onChangeFamilyMode={handleChangeFamilyMode}
          onChangePerson={handleChangePerson}
          onChangeActivity={setVerdictActivity}
          alertSubscription={alertSubscription}
          onJumpToIntelligence={() => navigateToSection('air-intelligence')}
          onJumpToPlan={() => navigateToSection('daily-plan')}
          onOpenAlertModal={() => setAlertModalOpen(true)}
        />

        {/* 01. Air Intelligence */}
        <AirIntelligenceSection
          liveLocationLabel={liveLocationLabel}
          liveCoords={liveCoords}
          liveReading={liveReading}
          isLoadingReading={isLoadingReading}
          readingError={readingError}
          citySuggestions={citySuggestions}
          onLookupCity={handleLookupCity}
          onLookupCoords={handleLookupCoords}
          onRetryFetch={handleRetryFetch}
          onOpenAlertModal={() => setAlertModalOpen(true)}
        />

        {/* 02–05 Tabbed Hub: Your plan for today */}
        <section id="your-plan" className="scroll-mt-24 border-t-2 border-[#111111] bg-[#F7F5EE]">
          <div className="mx-auto max-w-[1320px] px-4 pt-12 pb-4 sm:px-6 sm:pt-16">
            <h2 className="font-display-tight text-4xl font-extrabold text-[#111111] sm:text-6xl">
              Your plan for today
            </h2>

            <div
              role="tablist"
              aria-label="Your plan for today"
              className="mt-6 flex w-fit max-w-full flex-wrap gap-1.5 rounded-2xl border-2 border-[#111111] bg-white p-1.5 shadow-[4px_4px_0px_#111111]"
            >
              {PLAN_TABS.map((tab, idx) => {
                const isSelected = activePlanTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    type="button"
                    role="tab"
                    tabIndex={isSelected ? 0 : -1}
                    aria-selected={isSelected}
                    aria-controls={`panel-${tab.id}`}
                    onClick={() => setActivePlanTab(tab.id)}
                    onKeyDown={(e) => {
                      let nextIdx: number | null = null;
                      if (e.key === 'ArrowRight') nextIdx = (idx + 1) % PLAN_TABS.length;
                      else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + PLAN_TABS.length) % PLAN_TABS.length;
                      else if (e.key === 'Home') nextIdx = 0;
                      else if (e.key === 'End') nextIdx = PLAN_TABS.length - 1;
                      if (nextIdx !== null) {
                        e.preventDefault();
                        const target = PLAN_TABS[nextIdx];
                        setActivePlanTab(target.id);
                        document.getElementById(`tab-${target.id}`)?.focus();
                      }
                    }}
                    className={`rounded-xl px-4 py-2.5 text-xs font-extrabold whitespace-nowrap transition-colors sm:text-sm ${
                      isSelected
                        ? 'border-2 border-[#111111] bg-[#FFE14D] text-[#111111] shadow-[2px_2px_0px_#111111]'
                        : 'border-2 border-transparent text-[#33363E] hover:bg-[#F7F5EE]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            role="tabpanel"
            id={`panel-${activePlanTab}`}
            aria-labelledby={`tab-${activePlanTab}`}
          >
            {activePlanTab === 'daily-plan' && (
              <DailyPlanSection
                input={input}
                familyMode={familyMode}
                onChangeInput={(next) => {
                  setInput(next);
                  if (formValidationError) setFormValidationError(null);
                }}
                onChangeFamilyMode={handleChangeFamilyMode}
                plan={plan}
                cleanestWindowLabel={liveReading.cleanestWindow?.windowLabel || '3–5 PM'}
                adoptedIds={adoptedIds}
                impact={impact}
                isGenerating={isGenerating}
                planError={planError}
                formValidationError={formValidationError}
                onGeneratePlan={handleGeneratePlan}
                onToggleAdopt={handleToggleAdopt}
                onResetAdoption={handleResetAdoption}
                onExportPlan={handleExportPlan}
              />
            )}

            {activePlanTab === 'indoor-wellness' && (
              <IndoorWellnessSection
                plan={plan}
                liveReading={liveReading}
                familyMode={familyMode}
                adoptedIds={adoptedIds}
                onToggleAdopt={handleToggleAdopt}
              />
            )}

            {activePlanTab === 'sustainable-living' && (
              <SustainableLivingSection
                plan={plan}
                adoptedIds={adoptedIds}
                onToggleAdopt={handleToggleAdopt}
                onApplyPreset={handleApplyPreset}
                onAddFocusHint={handleAddFocusHint}
              />
            )}

            {activePlanTab === 'ask-chatbot' && (
              <AskChatbotSection
                liveLocationLabel={liveLocationLabel}
                liveReading={liveReading}
                verdict={currentVerdict.verdict}
                familyMode={familyMode}
                chatLanguage={chatLanguage}
                onChangeFamilyMode={handleChangeFamilyMode}
                onChangeLanguage={setChatLanguage}
                chatHistory={chatHistory}
                isChatLoading={isChatLoading}
                chatError={chatError}
                onSendChat={handleSendChat}
                onClearChat={handleClearChat}
              />
            )}
          </div>
        </section>

        <ImpactAndStoriesSection
          onJumpToDailyPlan={() => navigateToSection('daily-plan')}
          onNavigateSection={navigateToSection}
        />
      </main>

      <MenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigateSection={navigateToSection}
      />

      <SmogAlertModal
        open={alertModalOpen}
        mapsApiKey={mapsApiKey}
        mapsConfigured={mapsConfigured}
        existingSubscription={alertSubscription}
        defaultLocationQuery={liveLocationLabel || input.location}
        onClose={() => setAlertModalOpen(false)}
        onSaveSubscription={handleSaveAlertSubscription}
        onDisableSubscription={handleDisableAlertSubscription}
        onTestAlert={handleTestAlert}
      />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-5 bottom-5 z-50 rounded-2xl border-2 border-[#111111] bg-[#FFE14D] px-4 py-3 text-xs font-extrabold text-[#111111] shadow-[4px_4px_0px_#111111]"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
