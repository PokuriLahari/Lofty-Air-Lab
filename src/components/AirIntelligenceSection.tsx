import { useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertCircle,
  BellRing,
  Crosshair,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CitySuggestion, LatLngPoint, LocalAirReading } from '../types/air';
import {
  calculateWeeklyPm25Change,
  formatShortCityName,
} from '../utils/verdictRules';
import {
  buildDiurnalPollutionTrend,
  buildWeeklyPollutionTrend,
  estimatePmFromAqi,
} from '../utils/alertLogic';

interface AirIntelligenceSectionProps {
  liveLocationLabel: string;
  liveCoords: LatLngPoint;
  liveReading: LocalAirReading;
  isLoadingReading: boolean;
  readingError: string | null;
  citySuggestions: CitySuggestion[];
  onLookupCity: (query: string) => Promise<void>;
  onLookupCoords: (lat: number, lng: number, labelHint?: string) => Promise<void>;
  onRetryFetch: () => Promise<void>;
  onOpenAlertModal: () => void;
}

const QUICK_CITIES = [
  { label: 'Hyderabad', fullLabel: 'Hyderabad', lat: 17.39, lng: 78.49 },
  { label: 'Delhi', fullLabel: 'Delhi', lat: 28.61, lng: 77.21 },
  { label: 'Bengaluru', fullLabel: 'Bengaluru', lat: 12.97, lng: 77.59 },
  { label: 'Gurugram', fullLabel: 'Gurugram', lat: 28.46, lng: 77.03 },
  { label: 'Mumbai', fullLabel: 'Mumbai', lat: 19.08, lng: 72.88 },
];

export function AirIntelligenceSection({
  liveLocationLabel,
  liveCoords,
  liveReading,
  isLoadingReading,
  readingError,
  citySuggestions,
  onLookupCity,
  onLookupCoords,
  onRetryFetch,
  onOpenAlertModal,
}: AirIntelligenceSectionProps) {
  const [searchText, setSearchText] = useState('');
  const [chartView, setChartView] = useState<'weekly' | 'hourly'>('weekly');
  const [gpsLoading, setGpsLoading] = useState(false);

  const shortCity = formatShortCityName(liveLocationLabel, liveCoords);
  const displayCoords = liveReading.coords ?? liveCoords;
  const latStr = displayCoords.lat.toFixed(2);
  const lngStr = displayCoords.lng.toFixed(2);

  const pmFallback = useMemo(() => estimatePmFromAqi(liveReading.aqi), [liveReading.aqi]);
  const pm25Display = liveReading.stationUnavailable ? null : (liveReading.pm25 ?? pmFallback.pm25);
  const pm10Display = liveReading.stationUnavailable ? null : (liveReading.pm10 ?? pmFallback.pm10);

  const weeklySeries = useMemo(
    () =>
      liveReading.weeklyTrend && liveReading.weeklyTrend.length > 0
        ? liveReading.weeklyTrend
        : buildWeeklyPollutionTrend(liveReading.aqi, pm25Display ?? 37),
    [liveReading.aqi, liveReading.weeklyTrend, pm25Display]
  );

  const hourlySeries = useMemo(
    () =>
      liveReading.hourlyTrend && liveReading.hourlyTrend.length > 0
        ? liveReading.hourlyTrend
        : buildDiurnalPollutionTrend(liveReading.aqi, pm25Display ?? 37),
    [liveReading.aqi, liveReading.hourlyTrend, pm25Display]
  );

  const weeklyTrendStats = useMemo(
    () => calculateWeeklyPm25Change(weeklySeries),
    [weeklySeries]
  );

  const handleSearchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = searchText.trim();
    if (trimmed.length < 2 || isLoadingReading) return;
    await onLookupCity(trimmed);
  };

  const handleGpsDetect = () => {
    if (!('geolocation' in navigator)) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        void onLookupCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setGpsLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  return (
    <section
      id="air-intelligence"
      className="border-t-2 border-[#111111] bg-white px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-[1320px] space-y-8">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl space-y-2">
            <p className="mono-num text-xs font-bold tracking-wider text-[#3B66FF] uppercase">
              01. Air Intelligence · Live Pollutants &amp; 7-Day Trend
            </p>
            <h2 className="font-display-tight text-4xl font-extrabold text-[#111111] sm:text-6xl">
              What is in the air &amp; weekly trend
            </h2>
            <p className="text-base leading-relaxed text-[#444444]">
              Switch cities anytime to inspect the four main pollutants in plain language and track
              how fine smoke has moved over the last 7 days.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleGpsDetect}
              disabled={gpsLoading || isLoadingReading}
              className="roll-btn bg-[#F7F5EE] px-4 py-2.5 text-xs text-[#111111]"
            >
              {gpsLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Crosshair className="h-3.5 w-3.5 text-[#3B66FF]" aria-hidden="true" />
              )}
              <span>Use My Location</span>
            </button>

            <button
              type="button"
              onClick={onOpenAlertModal}
              className="roll-btn bg-[#FFE14D] px-4 py-2.5 text-xs text-[#111111]"
            >
              <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Map &amp; Alerts</span>
            </button>
          </div>
        </div>

        {/* Location Search + Quick City Chips */}
        <div className="space-y-3 rounded-2xl border-2 border-[#111111] bg-[#F7F5EE] p-4">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
              <label htmlFor="intel-location-search" className="sr-only">
                Search city or area for live air quality
              </label>
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#444444]"
                  aria-hidden="true"
                />
                <input
                  id="intel-location-search"
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search a city (e.g., Hyderabad, Delhi, Bengaluru)..."
                  className="w-full rounded-xl border-2 border-[#111111] bg-white py-2.5 pr-3 pl-10 text-sm font-semibold text-[#111111] outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isLoadingReading || searchText.trim().length < 2}
                className="roll-btn bg-[#3B66FF] px-5 py-2.5 text-xs text-white disabled:cursor-not-allowed disabled:bg-[#E2E8F0] disabled:text-[#475569] disabled:opacity-100"
              >
                {isLoadingReading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <span>Check Air</span>
                )}
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_CITIES.map((city) => {
                const isSelected = shortCity.toLowerCase().includes(city.label.toLowerCase());
                return (
                  <button
                    key={city.label}
                    type="button"
                    disabled={isLoadingReading}
                    onClick={() => void onLookupCoords(city.lat, city.lng, city.fullLabel)}
                    className={`rounded-full border-2 border-[#111111] px-3.5 py-1.5 text-xs font-extrabold whitespace-nowrap transition-colors ${
                      isSelected
                        ? 'bg-[#FFE14D] text-[#111111]'
                        : 'bg-white text-[#111111] hover:bg-[#C8F542]'
                    }`}
                  >
                    {city.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Closest match suggestions when user searches an unknown/misspelled city */}
          {citySuggestions.length > 0 && (
            <div
              role="status"
              data-testid="city-suggestions-bar"
              className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-[#111111] bg-[#FFE14D]/60 px-3.5 py-2.5 text-xs font-bold text-[#111111]"
            >
              <span>Could not match exact city. Try closest match:</span>
              {citySuggestions.map((s) => (
                <button
                  key={`${s.label}-${s.lat}`}
                  type="button"
                  onClick={() => {
                    setSearchText(s.name);
                    void onLookupCoords(s.lat, s.lng, s.name);
                  }}
                  className="rounded-full border border-[#111111] bg-white px-3 py-1 text-xs font-extrabold text-[#111111] hover:bg-[#C8F542]"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cached / API Error Banner with Retry button */}
        {(readingError || liveReading.isCached) && (
          <div
            role="alert"
            data-testid="air-api-status-banner"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-[#111111] bg-[#FF66B3]/25 px-4 py-3 text-xs font-bold text-[#111111]"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {liveReading.isCached
                  ? `Showing cached reading from ${liveReading.cachedTimestamp || liveReading.checkedAt}. ${readingError || ''}`
                  : readingError}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void onRetryFetch()}
              disabled={isLoadingReading}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#111111] bg-white px-3.5 py-1 text-xs font-extrabold text-[#111111] hover:bg-[#FFE14D]"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoadingReading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>Retry Live Check</span>
            </button>
          </div>
        )}

        {/* Station Unavailable notice */}
        {liveReading.stationUnavailable && (
          <div
            role="status"
            className="rounded-xl border-2 border-[#111111] bg-[#FFE14D] px-4 py-3 text-xs font-extrabold text-[#111111]"
          >
            No air quality monitoring reading is available near {shortCity} right now. Pick
            Hyderabad, Delhi, or Bengaluru above or retry shortly.
          </div>
        )}

        {/* Main Grid: Left 4 Pollutants (Shown Only Once) | Right Recharts Trend Line Graph */}
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
          {/* Left 5 columns: Pollutants Only (No repeated AQI / verdict / cleanest window) */}
          <div className="space-y-5 lg:col-span-5">
            <div className="lofty-card space-y-5 bg-[#111111] p-6 text-white">
              <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-4">
                <div className="flex items-center gap-1.5 text-sm font-extrabold text-[#70D6FF]">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  <span>{shortCity} · Pollutant Breakdown</span>
                </div>
                <span className="mono-num text-[11px] font-bold text-white/70">
                  Main: {liveReading.dominantPollutant || 'PM2.5'}
                </span>
              </div>

              {/* 4 Open-Meteo Pollutants: Plain words first, abbreviation in brackets */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                  <div className="text-xs font-bold text-white/85">Fine smoke (PM2.5)</div>
                  <div
                    data-testid="live-pm25-value"
                    className="mono-num mt-1.5 text-3xl font-extrabold text-[#C8F542]"
                  >
                    {pm25Display ?? '—'}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                  <div className="text-xs font-bold text-white/85">Road dust (PM10)</div>
                  <div
                    data-testid="live-pm10-value"
                    className="mono-num mt-1.5 text-3xl font-extrabold text-[#FFE14D]"
                  >
                    {pm10Display ?? '—'}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                  <div className="text-xs font-bold text-white/85">Ozone (O3)</div>
                  <div
                    data-testid="live-o3-value"
                    className="mono-num mt-1.5 text-3xl font-extrabold text-[#70D6FF]"
                  >
                    {liveReading.stationUnavailable ? '—' : (liveReading.o3 ?? '—')}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                  <div className="text-xs font-bold text-white/85">Traffic gas (NO2)</div>
                  <div
                    data-testid="live-no2-value"
                    className="mono-num mt-1.5 text-3xl font-extrabold text-[#FF66B3]"
                  >
                    {liveReading.stationUnavailable ? '—' : (liveReading.no2 ?? '—')}
                  </div>
                </div>
              </div>

              <p className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs font-bold text-[#FFE14D]">
                Safe limit 60 — above this, air is unhealthy.
              </p>

              <p className="mono-num text-[11px] text-white/65">
                Data: {liveReading.source || 'Open-Meteo'} ({latStr}, {lngStr}) · updated{' '}
                {liveReading.checkedAt}
              </p>
            </div>

            <div className="rounded-2xl border-2 border-[#111111] bg-[#F7F5EE] p-5 text-xs leading-relaxed text-[#22252A]">
              <p className="font-extrabold text-[#111111]">What these four readings track:</p>
              <p className="mt-1.5">
                <strong>Fine smoke (PM2.5)</strong> comes from vehicle exhaust, cooking smoke, and
                burning; <strong>Road dust (PM10)</strong> rises from dry sweeping and construction;{' '}
                <strong>Ozone (O3)</strong> forms in strong afternoon sunlight;{' '}
                <strong>Traffic gas (NO2)</strong> spikes along busy junctions.
              </p>
            </div>
          </div>

          {/* Right 7 columns: Recharts Weekly PM2.5 Line Graph + 24h Window Toggle */}
          <div className="lofty-card flex flex-col justify-between space-y-5 bg-[#F7F5EE] p-6 sm:p-7 lg:col-span-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-extrabold tracking-wide text-[#3B66FF] uppercase">
                  <Activity className="h-4 w-4" aria-hidden="true" />
                  <span>Pollution Trend</span>
                </div>
                <h3 className="font-display mt-1 text-2xl font-extrabold text-[#111111]">
                  {chartView === 'weekly'
                    ? 'Weekly PM2.5 Trend (7 Days)'
                    : 'Next 24-Hour Daylight PM2.5 Forecast'}
                </h3>
              </div>

              <div className="inline-flex rounded-xl border-2 border-[#111111] bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setChartView('weekly')}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-extrabold whitespace-nowrap ${
                    chartView === 'weekly'
                      ? 'bg-[#111111] text-white'
                      : 'text-[#111111] hover:bg-[#F7F5EE]'
                  }`}
                >
                  7-Day PM2.5
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('hourly')}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-extrabold whitespace-nowrap ${
                    chartView === 'hourly'
                      ? 'bg-[#111111] text-white'
                      : 'text-[#111111] hover:bg-[#F7F5EE]'
                  }`}
                >
                  Next 24h Curve
                </button>
              </div>
            </div>

            {/* Recharts LineChart Container */}
            <div
              data-testid="recharts-pm25-container"
              className="rounded-2xl border-2 border-[#111111] bg-white p-4"
            >
              <div className="h-64 w-full sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === 'weekly' ? (
                    <LineChart
                      data={weeklySeries}
                      margin={{ top: 28, right: 20, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid stroke="#111111" strokeOpacity={0.1} strokeDasharray="4 4" />
                      <XAxis
                        dataKey="day"
                        padding={{ left: 24, right: 22 }}
                        tick={{ fill: '#111111', fontSize: 12, fontWeight: 700 }}
                        axisLine={{ stroke: '#111111', strokeWidth: 2 }}
                        tickLine={false}
                      />
                      <YAxis
                        width={36}
                        tick={{ fill: '#444444', fontSize: 11, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, (dataMax: number) => Math.max(75, Math.ceil(dataMax * 1.15))]}
                      />
                      <ReferenceLine
                        y={60}
                        stroke="#FF6B35"
                        strokeDasharray="5 5"
                        label={{
                          value: 'above this line, air is unhealthy',
                          position: 'insideTopRight',
                          fill: '#C2410C',
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '14px',
                          border: '2px solid #111111',
                          boxShadow: '4px 4px 0px #111111',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                        formatter={(value) => [`${String(value ?? '')}`, 'Daily Avg PM2.5']}
                      />
                      <Line
                        type="monotone"
                        dataKey="pm25"
                        name="Daily Avg PM2.5"
                        stroke="#111111"
                        strokeWidth={3.5}
                        dot={{
                          r: 5.5,
                          fill: '#3B66FF',
                          stroke: '#111111',
                          strokeWidth: 2,
                        }}
                        activeDot={{
                          r: 8,
                          fill: '#FFE14D',
                          stroke: '#111111',
                          strokeWidth: 2.5,
                        }}
                      >
                        <LabelList
                          dataKey="pm25"
                          position="top"
                          offset={10}
                          style={{ fill: '#111111', fontSize: 12, fontWeight: 800 }}
                        />
                      </Line>
                    </LineChart>
                  ) : (
                    <LineChart
                      data={hourlySeries}
                      margin={{ top: 28, right: 20, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid stroke="#111111" strokeOpacity={0.1} strokeDasharray="4 4" />
                      <XAxis
                        dataKey="hour"
                        padding={{ left: 24, right: 22 }}
                        tick={{ fill: '#111111', fontSize: 11, fontWeight: 700 }}
                        axisLine={{ stroke: '#111111', strokeWidth: 2 }}
                        tickLine={false}
                      />
                      <YAxis
                        width={36}
                        tick={{ fill: '#444444', fontSize: 11, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, (dataMax: number) => Math.max(75, Math.ceil(dataMax * 1.15))]}
                      />
                      <ReferenceLine
                        y={60}
                        stroke="#FF6B35"
                        strokeDasharray="5 5"
                        label={{
                          value: 'above this line, air is unhealthy',
                          position: 'insideTopRight',
                          fill: '#C2410C',
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '14px',
                          border: '2px solid #111111',
                          boxShadow: '4px 4px 0px #111111',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                        formatter={(value) => [`${String(value ?? '')}`, 'Hourly PM2.5']}
                      />
                      <Line
                        type="monotone"
                        dataKey="pm25"
                        name="Hourly PM2.5"
                        stroke="#3B66FF"
                        strokeWidth={3.5}
                        dot={{
                          r: 5,
                          fill: '#C8F542',
                          stroke: '#111111',
                          strokeWidth: 2,
                        }}
                        activeDot={{
                          r: 8,
                          fill: '#FFE14D',
                          stroke: '#111111',
                          strokeWidth: 2.5,
                        }}
                      >
                        <LabelList
                          dataKey="pm25"
                          position="top"
                          offset={10}
                          style={{ fill: '#111111', fontSize: 11, fontWeight: 800 }}
                        />
                      </Line>
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Trend Summary Footer */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#111111]/15 pt-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-[#111111]">
                  {weeklyTrendStats.direction === 'worsened' ? (
                    <TrendingUp className="h-4 w-4 text-[#FF6B35]" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-[#3B66FF]" aria-hidden="true" />
                  )}
                  <span
                    className={`rounded-lg border border-[#111111] px-2.5 py-0.5 text-xs font-extrabold ${
                      weeklyTrendStats.direction === 'improved'
                        ? 'bg-[#C8F542]'
                        : weeklyTrendStats.direction === 'worsened'
                          ? 'bg-[#FFE14D]'
                          : 'bg-[#F7F5EE]'
                    }`}
                  >
                    {weeklyTrendStats.summaryText}
                  </span>
                </div>

                <span className="mono-num text-[11px] font-bold text-[#444444]">
                  Orange line (60): above this line, air is unhealthy
                </span>
              </div>
            </div>

            <p className="text-xs leading-relaxed font-medium text-[#3A3D45]">
              <strong className="font-extrabold text-[#111111]">Reading your trend:</strong> Watching
              7-day PM2.5 averages helps families spot genuine drops after wind or rain versus
              temporary afternoon dips—plan longer outdoor errands on multi-day improving streaks.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
