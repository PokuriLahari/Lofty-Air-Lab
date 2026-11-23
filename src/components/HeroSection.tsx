import {
  AlertCircle,
  ArrowDownRight,
  Bell,
  BellRing,
  MapPin,
  Users,
  Wind,
} from 'lucide-react';
import { SkyBackdrop } from './SkyBackdrop';
import type {
  FamilyMode,
  LatLngPoint,
  LocalAirReading,
  SmogAlertSubscription,
  VerdictActivity,
  VerdictPerson,
} from '../types/air';
import { FAMILY_MODE_LABELS, VALID_FAMILY_MODES } from '../utils/airImpact';
import {
  ACTIVITY_OPTIONS,
  AQI_SCALE_BANDS,
  classifyOpenMeteoAqiBadge,
  computeSafetyVerdict,
  formatShortCityName,
  PERSON_OPTIONS,
} from '../utils/verdictRules';

interface HeroSectionProps {
  clarity: number;
  hazeLevel: number;
  liveReading: LocalAirReading;
  liveCoords: LatLngPoint;
  liveLocationLabel: string;
  familyMode: FamilyMode;
  verdictPerson: VerdictPerson;
  verdictActivity: VerdictActivity;
  onChangeFamilyMode: (mode: FamilyMode) => void;
  onChangePerson: (person: VerdictPerson) => void;
  onChangeActivity: (activity: VerdictActivity) => void;
  alertSubscription: SmogAlertSubscription | null;
  onJumpToIntelligence: () => void;
  onJumpToPlan: () => void;
  onOpenAlertModal: () => void;
}

export function HeroSection({
  clarity,
  hazeLevel,
  liveReading,
  liveCoords,
  liveLocationLabel,
  familyMode,
  verdictPerson,
  verdictActivity,
  onChangeFamilyMode,
  onChangePerson,
  onChangeActivity,
  alertSubscription,
  onJumpToIntelligence,
  onJumpToPlan,
  onOpenAlertModal,
}: HeroSectionProps) {
  const shortCity = formatShortCityName(liveLocationLabel, liveCoords);
  const badge = classifyOpenMeteoAqiBadge(liveReading.pm25, liveReading.aqi);
  const verdictResult = computeSafetyVerdict({
    pm25: liveReading.pm25,
    aqi: liveReading.aqi,
    person: verdictPerson,
    activity: verdictActivity,
    stationUnavailable: liveReading.stationUnavailable,
  });

  const cleanestWindowShort = liveReading.cleanestWindow?.windowLabel || '3–5 PM';
  const verdictSentence = liveReading.stationUnavailable
    ? 'Live reading unavailable right now — check a nearby city below.'
    : `${badge.category} — ${verdictResult.verdict.toLowerCase()}, best time out is ${cleanestWindowShort}.`;

  const displayCoords = liveReading.coords ?? liveCoords;
  const latStr = displayCoords.lat.toFixed(2);
  const lngStr = displayCoords.lng.toFixed(2);

  return (
    <section id="top" className="relative overflow-hidden px-4 pt-6 pb-16 sm:px-6 sm:pt-8 sm:pb-20">
      <SkyBackdrop clarity={clarity} hazeLevel={hazeLevel} />

      <div className="relative z-10 mx-auto max-w-[1320px] space-y-8">
        {/* Centered Editorial Hero Statement */}
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-display-tight text-5xl font-extrabold tracking-tight text-[#111111] sm:text-6xl lg:text-[4.5rem]">
            <span className="block">we help your flat</span>
            <span className="mt-1.5 inline-flex flex-wrap items-center justify-center gap-3">
              <span>BREATHE</span>
              <span className="inline-block -rotate-2 rounded-[22px] border-2 border-[#111111] bg-[#FFE14D] px-5 py-1 shadow-[6px_6px_0px_#111111]">
                EASY
              </span>
            </span>
          </h1>

          <p className="mx-auto max-w-2xl pt-3.5 text-base leading-relaxed font-medium text-[#22252A] sm:text-lg">
            Get one clear answer in 10 seconds: is it safe to step out right now, when is the
            cleanest 2-hour window today, and how is PM2.5 trending this week?
          </p>

          {/* Compact Family Mode Switcher */}
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-[#111111] uppercase">
              <Users className="h-3.5 w-3.5 text-[#3B66FF]" aria-hidden="true" />
              <span>Family Safety Mode</span>
            </div>
            <div
              role="group"
              aria-label="Select Family Mode"
              className="inline-flex flex-wrap justify-center gap-1.5 rounded-2xl border-2 border-[#111111] bg-white p-1.5 shadow-[4px_4px_0px_#111111]"
            >
              {VALID_FAMILY_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={familyMode === mode}
                  onClick={() => onChangeFamilyMode(mode)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-extrabold whitespace-nowrap transition-colors sm:text-sm ${
                    familyMode === mode
                      ? 'border-2 border-[#111111] bg-[#FFE14D] text-[#111111]'
                      : 'border-2 border-transparent text-[#33363E] hover:bg-[#F7F5EE]'
                  }`}
                >
                  {FAMILY_MODE_LABELS[mode].short}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={onJumpToIntelligence}
              className="roll-btn bg-[#3B66FF] px-8 py-4 text-base text-white"
            >
              <span className="roll-mask">
                <span className="roll-track">
                  <span>Check City Air &amp; Trend</span>
                  <span aria-hidden="true">Check City Air &amp; Trend</span>
                </span>
              </span>
              <ArrowDownRight className="h-5 w-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onOpenAlertModal}
              className={`roll-btn px-7 py-4 text-base text-[#111111] ${
                alertSubscription?.enabled ? 'bg-[#C8F542]' : 'bg-[#FFE14D]'
              }`}
            >
              {alertSubscription?.enabled ? (
                <BellRing className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Bell className="h-5 w-5" aria-hidden="true" />
              )}
              <span className="roll-mask">
                <span className="roll-track">
                  <span>{alertSubscription?.enabled ? 'Alert Active' : 'Get Alert'}</span>
                  <span aria-hidden="true">
                    {alertSubscription?.enabled ? 'Manage Alert' : 'Get Alert'}
                  </span>
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={onJumpToPlan}
              className="roll-btn bg-white px-7 py-4 text-base text-[#111111]"
            >
              <span className="roll-mask">
                <span className="roll-track">
                  <span>Make My Daily Plan</span>
                  <span aria-hidden="true">Make My Daily Plan</span>
                </span>
              </span>
            </button>
          </div>

          {alertSubscription?.enabled && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={onOpenAlertModal}
                className="inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-[#111111] bg-white px-4 py-1.5 text-xs font-bold text-[#111111] shadow-[3px_3px_0px_#111111] hover:bg-[#C8F542]"
              >
                <BellRing className="h-3.5 w-3.5 text-[#3B66FF]" aria-hidden="true" />
                <span>
                  Watching <strong>{formatShortCityName(alertSubscription.locationLabel)}</strong> ·
                  Alert at AQI {alertSubscription.thresholdAqi}+
                </span>
              </button>
            </div>
          )}
        </div>

        {/* 10-Second Verdict Quick-Answer Card + Clean Home Visual */}
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          <div className="lofty-card flex flex-col justify-between gap-5 bg-white p-6 sm:p-8 lg:col-span-7">
            {/* Top Row: City + ONE Large AQI Number + Unified 5-Step Colour Scale */}
            <div className="space-y-3 border-b-2 border-[#111111]/10 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-extrabold text-[#111111]">
                  <MapPin className="h-4 w-4 text-[#3B66FF]" aria-hidden="true" />
                  <span data-testid="hero-city-name">{shortCity}</span>
                </div>

                <span className="mono-num text-[11px] font-bold tracking-wider text-[#3B66FF] uppercase">
                  10-Second Air Check
                </span>
              </div>

              {/* Single Large AQI Readout */}
              <div className="flex flex-wrap items-center gap-4">
                <div
                  data-testid="hero-aqi-number"
                  className={`mono-num inline-flex items-baseline gap-2.5 rounded-2xl border-2 border-[#111111] px-5 py-2.5 shadow-[4px_4px_0px_#111111] ${badge.badgeBg} ${badge.badgeText}`}
                >
                  <span className="text-4xl font-extrabold sm:text-5xl">
                    {liveReading.stationUnavailable ? '—' : liveReading.aqi}
                  </span>
                  <span className="text-sm font-extrabold tracking-wide uppercase">
                    AQI · {liveReading.stationUnavailable ? 'Unavailable' : badge.category}
                  </span>
                </div>
              </div>

              {/* Small 5-Step Colour Scale Under AQI Number */}
              <div
                aria-label="AQI colour scale"
                className="grid grid-cols-5 gap-1.5 pt-1"
                data-testid="hero-aqi-scale"
              >
                {AQI_SCALE_BANDS.map((band) => {
                  const isActive = !liveReading.stationUnavailable && badge.category === band.category;
                  return (
                    <div
                      key={band.category}
                      className={`rounded-lg px-1.5 py-1 text-center transition-all ${
                        isActive
                          ? 'border-2 border-[#111111] shadow-[2px_2px_0px_#111111]'
                          : 'border border-[#111111]/25 opacity-75'
                      } ${band.badgeBg} ${band.badgeText}`}
                    >
                      <div className="text-[10px] leading-tight font-extrabold sm:text-[11px]">
                        {band.category}
                      </div>
                      <div className="mono-num text-[9px] font-bold opacity-90 sm:text-[10px]">
                        {band.rangeLabel}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Two Simple Questions: Who + Activity */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <span className="text-[11px] font-extrabold tracking-wide text-[#444444] uppercase">
                  1. Who is going out?
                </span>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Who is going out">
                  {PERSON_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={verdictPerson === opt.id}
                      onClick={() => onChangePerson(opt.id)}
                      className={`rounded-xl border-2 border-[#111111] px-3 py-1.5 text-xs font-extrabold transition-colors ${
                        verdictPerson === opt.id
                          ? 'bg-[#111111] text-white'
                          : 'bg-[#F7F5EE] text-[#111111] hover:bg-[#FFE14D]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-extrabold tracking-wide text-[#444444] uppercase">
                  2. What are you doing?
                </span>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="What are you doing">
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={verdictActivity === opt.id}
                      onClick={() => onChangeActivity(opt.id)}
                      className={`rounded-xl border-2 border-[#111111] px-3 py-1.5 text-xs font-extrabold transition-colors ${
                        verdictActivity === opt.id
                          ? 'bg-[#3B66FF] text-white'
                          : 'bg-[#F7F5EE] text-[#111111] hover:bg-[#FFE14D]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Single Unified Verdict Line + Plain Action Guidance */}
            <div className="space-y-2 rounded-2xl border-2 border-[#111111] bg-[#F7F5EE] p-4">
              <p
                data-testid="hero-verdict-line"
                className="font-display text-lg font-extrabold text-[#111111] sm:text-xl"
              >
                {verdictSentence}
              </p>
              <p className="text-sm leading-relaxed font-medium text-[#22252A]">
                <strong className="font-extrabold">What to do:</strong> {verdictResult.actionTip}
              </p>
              {verdictResult.vulnerableReason && (
                <p className="flex items-start gap-1.5 text-xs font-bold text-[#9A1B54]">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{verdictResult.vulnerableReason}</span>
                </p>
              )}
            </div>

            {/* Small Open-Meteo Data Footnote with Coordinates */}
            <p className="mono-num text-[11px] font-medium text-[#555555]">
              Data: {liveReading.source || 'Open-Meteo'} ({latStr}, {lngStr}) · updated{' '}
              {liveReading.checkedAt}
            </p>
          </div>

          <div className="lofty-card relative bg-[#FFE14D] p-3.5 sm:p-4 lg:col-span-5">
            <div className="relative h-full min-h-[280px] overflow-hidden rounded-[18px] border-2 border-[#111111] bg-gradient-to-br from-[#D9F1FF] to-[#FFE14D]">
              <img
                src="/src/assets/images/indian_hero_family_1795463057544.jpg"
                alt="Indian parents and two school-age children relaxing inside a bright Hyderabad high-rise apartment beside sliding balcony doors overlooking a gated society"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-5 text-white">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Wind className="h-4 w-4 text-[#C8F542]" aria-hidden="true" />
                  <span>Mode: {FAMILY_MODE_LABELS[familyMode].label}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
