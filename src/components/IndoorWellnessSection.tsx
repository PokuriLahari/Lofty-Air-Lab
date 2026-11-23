import { useMemo, useState } from 'react';
import { Check, DoorOpen, Fan, Home, ShieldCheck, Wind } from 'lucide-react';
import type {
  FamilyMode,
  GeneratedAirPlan,
  IndoorAirHack,
  LocalAirReading,
  RoomFilterCategory,
} from '../types/air';
import { classifyHackRoomCategory, DEFAULT_BASELINE_PLAN, FAMILY_MODE_LABELS } from '../utils/airImpact';
import { getVentilationStatus } from '../utils/alertLogic';

interface IndoorWellnessSectionProps {
  plan: GeneratedAirPlan;
  liveReading: LocalAirReading;
  familyMode: FamilyMode;
  adoptedIds: string[];
  onToggleAdopt: (itemId: string) => void;
}

const ROOM_TABS: Array<{ id: RoomFilterCategory; label: string }> = [
  { id: 'all', label: 'All Rooms' },
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'living', label: 'Living & Balcony' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'hallway', label: 'Hallway & Entrance' },
];

export function IndoorWellnessSection({
  plan,
  liveReading,
  familyMode,
  adoptedIds,
  onToggleAdopt,
}: IndoorWellnessSectionProps) {
  const [roomFilter, setRoomFilter] = useState<RoomFilterCategory>('all');
  const adoptedSet = new Set(adoptedIds);
  const cleanestWindowLabel = liveReading.cleanestWindow?.windowLabel || '3–5 PM';
  const ventilation = useMemo(
    () => getVentilationStatus(liveReading.aqi, cleanestWindowLabel),
    [cleanestWindowLabel, liveReading.aqi]
  );

  const filteredHacks = useMemo<IndoorAirHack[]>(() => {
    if (roomFilter === 'all') return plan.indoorHacks;
    const directMatches = plan.indoorHacks.filter(
      (hack) => classifyHackRoomCategory(hack.roomFocus) === roomFilter
    );
    if (directMatches.length > 0) return directMatches;

    // Fallback to matching baseline room tip so no room tab is ever empty
    return DEFAULT_BASELINE_PLAN.indoorHacks.filter(
      (hack) => classifyHackRoomCategory(hack.roomFocus) === roomFilter
    );
  }, [plan.indoorHacks, roomFilter]);

  return (
    <div
      id="indoor-wellness"
      className="border-t-2 border-[#111111] bg-white px-4 pt-8 pb-16 sm:px-6 sm:pt-10 sm:pb-20"
    >
      <div className="mx-auto max-w-[1320px] space-y-10">
        {/* Header */}
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl space-y-2">
            <p className="mono-num text-xs font-bold tracking-wider text-[#3B66FF] uppercase">
              03. Indoor Wellness
            </p>
            <h2 className="font-display-tight text-4xl font-extrabold text-[#111111] sm:text-6xl">
              Room-by-room clean indoor air
            </h2>
            <p className="text-base leading-relaxed text-[#444444]">
              Practical ventilation timing, air purifier &amp; DIY fan filter guidance, and room-wise
              air quality hacks tailored to {FAMILY_MODE_LABELS[familyMode].label}.
            </p>
          </div>
        </div>

        {/* Top Intelligence Row: Live Ventilation Recommendation + Air Purifier Guide */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lofty-card flex flex-col justify-between gap-4 bg-[#70D6FF] p-6 text-[#111111] sm:p-7 lg:col-span-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide uppercase">
                  <DoorOpen className="h-4 w-4" aria-hidden="true" />
                  <span>Ventilation Guidance</span>
                </span>
                <span className="mono-num rounded-full border-2 border-[#111111] bg-white px-3 py-1 text-xs font-extrabold">
                  {ventilation.statusLabel}
                </span>
              </div>

              <h3 className="font-display text-2xl font-extrabold text-[#111111]">
                Best window time: {ventilation.bestHours}
              </h3>
              <p className="text-sm leading-relaxed font-semibold text-[#111111]/90">
                {ventilation.guidance}
              </p>
            </div>

            <div className="border-t-2 border-[#111111]/15 pt-3 text-xs font-bold text-[#111111]">
              <Wind className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
              Open opposite balcony doors briefly during this stretch, then shut before evening
              traffic builds.
            </div>
          </div>

          <div className="lofty-card flex flex-col justify-between gap-4 bg-[#111111] p-6 text-white sm:p-7 lg:col-span-7">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-extrabold tracking-wide text-[#C8F542] uppercase">
                <Fan className="h-4 w-4" aria-hidden="true" />
                <span>Air Purifier &amp; Budget DIY Guidance</span>
              </div>
              <h3 className="font-display text-2xl font-extrabold text-white">
                How to clean sleeping rooms without overspending
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/5 p-3.5">
                <div className="text-xs font-extrabold text-[#FFE14D]">Free Barrier</div>
                <p className="mt-1 text-xs leading-relaxed text-white/80">
                  Close bedroom doors at night, towel-seal door bottom gaps, and wet-mop instead of
                  dry sweeping.
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/5 p-3.5">
                <div className="text-xs font-extrabold text-[#C8F542]">₹1,500 DIY Fan Filter</div>
                <p className="mt-1 text-xs leading-relaxed text-white/80">
                  ₹600 filter sheet + a fan you already own = ₹1,500 total, vs ₹15,000 for a
                  purifier.
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/5 p-3.5">
                <div className="text-xs font-extrabold text-[#70D6FF]">Purifier Sizing</div>
                <p className="mt-1 text-xs leading-relaxed text-white/80">
                  Use True-HEPA (never ozone ionizers) sized 250+ CADR for bedrooms and replace
                  pre-filters monthly.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Room-wise Suggestions Filter & Grid */}
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-extrabold tracking-wide text-[#111111] uppercase">
              <Home className="h-4 w-4 text-[#3B66FF]" aria-hidden="true" />
              <span>Room-Wise Suggestions</span>
            </div>

            <div
              role="tablist"
              aria-label="Filter indoor hacks by room"
              className="flex flex-wrap gap-1.5 rounded-2xl border-2 border-[#111111] bg-[#F7F5EE] p-1.5"
            >
              {ROOM_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={roomFilter === tab.id}
                  onClick={() => setRoomFilter(tab.id)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-extrabold whitespace-nowrap transition-colors ${
                    roomFilter === tab.id
                      ? 'border-2 border-[#111111] bg-[#111111] text-white'
                      : 'border-2 border-transparent text-[#111111] hover:bg-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`grid grid-cols-1 gap-5 ${filteredHacks.length > 1 ? 'md:grid-cols-2' : ''}`}
            role="tabpanel"
          >
            {filteredHacks.map((hack) => {
              const isChecked = adoptedSet.has(hack.id);
              return (
                <div
                  key={hack.id}
                  className={`rounded-[22px] border-2 border-[#111111] p-6 transition-all ${
                    isChecked
                      ? 'bg-[#70D6FF]/35 shadow-[5px_5px_0px_#111111]'
                      : 'bg-[#F7F5EE] hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs font-bold text-[#444444]">
                      <span>{hack.roomFocus}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="text-[#111111]">{hack.costTier}</span>
                    </div>
                    <button
                      type="button"
                      aria-pressed={isChecked}
                      aria-label={`Apply indoor hack: ${hack.title}`}
                      onClick={() => onToggleAdopt(hack.id)}
                      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border-2 border-[#111111] px-3 text-xs font-extrabold ${
                        isChecked
                          ? 'bg-[#111111] text-white'
                          : 'bg-white text-[#111111] hover:bg-[#C8F542]'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{isChecked ? 'Active' : 'Use Hack'}</span>
                    </button>
                  </div>

                  <h4 className="font-display mt-2 text-xl font-extrabold text-[#111111]">
                    {hack.title}
                  </h4>
                  <p className="mono-num mt-1 text-xs font-bold text-[#3B66FF]">
                    {hack.impactMetric.replace(/\b\d+\s*%/g, '').trim()} (-{hack.pm25ReductionPct}%
                    room smoke &amp; dust)
                  </p>

                  <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-sm text-[#22252A]">
                    {hack.steps.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ol>

                  <div className="mt-4 flex items-start gap-2 border-t border-[#111111]/15 pt-3 text-xs leading-relaxed text-[#33363E]">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3B66FF]" aria-hidden="true" />
                    <p>
                      <strong className="font-extrabold text-[#111111]">Why it helps:</strong>{' '}
                      {hack.explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
