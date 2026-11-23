import type { FormEvent } from 'react';
import {
  Bike,
  Check,
  Download,
  Footprints,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
  Wind,
} from 'lucide-react';
import type {
  AirPlannerInput,
  CommuteMode,
  FamilyMode,
  GeneratedAirPlan,
  HeatingSource,
  HouseholdType,
  ImpactSummary,
  SmogSeverity,
} from '../types/air';
import { CITY_PRESETS } from '../data/loftyContent';
import {
  COMMUTE_LABELS,
  FAMILY_MODE_LABELS,
  getAqiTierMeta,
  HEATING_LABELS,
  HOUSEHOLD_LABELS,
  VALID_FAMILY_MODES,
} from '../utils/airImpact';

interface DailyPlanSectionProps {
  input: AirPlannerInput;
  familyMode: FamilyMode;
  onChangeInput: (next: AirPlannerInput) => void;
  onChangeFamilyMode: (mode: FamilyMode) => void;
  plan: GeneratedAirPlan;
  cleanestWindowLabel: string;
  adoptedIds: string[];
  impact: ImpactSummary;
  isGenerating: boolean;
  planError: string | null;
  formValidationError: string | null;
  onGeneratePlan: (e: FormEvent) => void;
  onToggleAdopt: (itemId: string) => void;
  onResetAdoption: () => void;
  onExportPlan: () => void;
}

export function DailyPlanSection({
  input,
  familyMode,
  onChangeInput,
  onChangeFamilyMode,
  plan,
  cleanestWindowLabel,
  adoptedIds,
  impact,
  isGenerating,
  planError,
  formValidationError,
  onGeneratePlan,
  onToggleAdopt,
  onResetAdoption,
  onExportPlan,
}: DailyPlanSectionProps) {
  const adoptedSet = new Set(adoptedIds);
  const aqiMeta = getAqiTierMeta(plan.smogSeverity);

  return (
    <div
      id="daily-plan"
      className="bg-[#F7F5EE] px-4 pt-6 pb-16 sm:px-6 sm:pt-8 sm:pb-20"
    >
      <div className="mx-auto max-w-[1320px] space-y-10">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl space-y-2">
            <p className="mono-num text-xs font-bold tracking-wider text-[#3B66FF] uppercase">
              02. My Daily Plan
            </p>
            <h2 className="font-display-tight text-4xl font-extrabold text-[#111111] sm:text-6xl">
              AI morning-to-evening schedule
            </h2>
            <p className="text-base leading-relaxed text-[#444444]">
              Tailored low-emission daily routines, safer outdoor activity windows, and commute
              recommendations customized for your household and Family Mode.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-bold text-[#444444]">Quick city setups:</span>
            {CITY_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChangeInput({ ...preset.input, familyMode })}
                className={`rounded-full border-2 border-[#111111] px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                  input.location === preset.input.location
                    ? 'bg-[#FFE14D] text-[#111111] shadow-[2px_2px_0px_#111111]'
                    : 'bg-white text-[#111111] hover:bg-[#FFE14D]/50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Two-Column Workspace */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Left Form */}
          <form
            onSubmit={onGeneratePlan}
            noValidate
            className="lofty-card space-y-5 bg-white p-6 sm:p-7 lg:col-span-4"
          >
            <div className="space-y-1">
              <h3 className="font-display text-2xl font-extrabold text-[#111111]">
                Your Flat &amp; Family Setup
              </h3>
              <p className="text-xs font-medium text-[#4A4E57]">
                Generates a fresh morning-to-evening routine synced to pollution level and age
                group.
              </p>
            </div>

            <div>
              <label
                htmlFor="air-location"
                className="mb-1.5 block text-xs font-bold tracking-wide text-[#111111] uppercase"
              >
                Your City or Society Area
              </label>
              <input
                id="air-location"
                type="text"
                value={input.location}
                onChange={(e) => onChangeInput({ ...input, location: e.target.value })}
                placeholder="e.g., Gurugram Sector 56, Noida, Powai Mumbai"
                maxLength={120}
                required
                className="w-full rounded-xl border-2 border-[#111111] bg-[#F7F5EE] px-4 py-2.5 text-sm font-semibold text-[#111111] outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="air-family-mode"
                className="mb-1.5 block text-xs font-bold tracking-wide text-[#111111] uppercase"
              >
                Family Focus Mode
              </label>
              <select
                id="air-family-mode"
                value={familyMode}
                onChange={(e) => {
                  const nextMode = e.target.value as FamilyMode;
                  onChangeFamilyMode(nextMode);
                  onChangeInput({ ...input, familyMode: nextMode });
                }}
                className="w-full rounded-xl border-2 border-[#111111] bg-[#F7F5EE] px-4 py-2.5 text-sm font-semibold text-[#111111] outline-none"
              >
                {VALID_FAMILY_MODES.map((m) => (
                  <option key={m} value={m}>
                    {FAMILY_MODE_LABELS[m].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="air-severity"
                className="mb-1.5 block text-xs font-bold tracking-wide text-[#111111] uppercase"
              >
                Outside Pollution Level
              </label>
              <select
                id="air-severity"
                value={input.smogSeverity}
                onChange={(e) =>
                  onChangeInput({ ...input, smogSeverity: e.target.value as SmogSeverity })
                }
                className="w-full rounded-xl border-2 border-[#111111] bg-[#F7F5EE] px-4 py-2.5 text-sm font-semibold text-[#111111] outline-none"
              >
                <option value="moderate">Moderate (AQI 51–100)</option>
                <option value="sensitive">Poor (AQI 101–150)</option>
                <option value="severe">Unhealthy (AQI 151–200)</option>
                <option value="hazardous">Severe (AQI 200+)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <label
                  htmlFor="air-household"
                  className="mb-1.5 block text-xs font-bold tracking-wide text-[#111111] uppercase"
                >
                  Who Lives in Your Flat?
                </label>
                <select
                  id="air-household"
                  value={input.household}
                  onChange={(e) =>
                    onChangeInput({ ...input, household: e.target.value as HouseholdType })
                  }
                  className="w-full rounded-xl border-2 border-[#111111] bg-[#F7F5EE] px-4 py-2.5 text-sm font-semibold text-[#111111] outline-none"
                >
                  {Object.entries(HOUSEHOLD_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="air-heating"
                  className="mb-1.5 block text-xs font-bold tracking-wide text-[#111111] uppercase"
                >
                  Kitchen &amp; Flat Setup
                </label>
                <select
                  id="air-heating"
                  value={input.heating}
                  onChange={(e) =>
                    onChangeInput({ ...input, heating: e.target.value as HeatingSource })
                  }
                  className="w-full rounded-xl border-2 border-[#111111] bg-[#F7F5EE] px-4 py-2.5 text-sm font-semibold text-[#111111] outline-none"
                >
                  {Object.entries(HEATING_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="air-commute"
                className="mb-1.5 block text-xs font-bold tracking-wide text-[#111111] uppercase"
              >
                Daily Travel &amp; Commute
              </label>
              <select
                id="air-commute"
                value={input.commute}
                onChange={(e) =>
                  onChangeInput({ ...input, commute: e.target.value as CommuteMode })
                }
                className="w-full rounded-xl border-2 border-[#111111] bg-[#F7F5EE] px-4 py-2.5 text-sm font-semibold text-[#111111] outline-none"
              >
                {Object.entries(COMMUTE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="air-notes"
                className="mb-1.5 block text-xs font-bold tracking-wide text-[#111111] uppercase"
              >
                Extra Flat Notes (Optional)
              </label>
              <textarea
                id="air-notes"
                rows={2}
                value={input.notes}
                onChange={(e) => onChangeInput({ ...input, notes: e.target.value })}
                placeholder="e.g., 10th floor facing main road, toddler at home..."
                maxLength={480}
                className="w-full rounded-xl border-2 border-[#111111] bg-[#F7F5EE] px-4 py-2.5 text-sm font-medium text-[#111111] outline-none"
              />
            </div>

            {formValidationError && (
              <div
                role="alert"
                className="rounded-xl border-2 border-[#111111] bg-[#FF66B3]/25 px-4 py-3 text-xs font-bold text-[#111111]"
              >
                {formValidationError}
              </div>
            )}

            {planError && (
              <div
                role="alert"
                className="rounded-xl border-2 border-[#111111] bg-[#FF6B35]/20 px-4 py-3 text-xs font-bold text-[#111111]"
              >
                {planError}
              </div>
            )}

            <button
              type="submit"
              disabled={isGenerating}
              className="roll-btn w-full bg-[#3B66FF] py-3.5 text-sm text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Building Daily Schedule...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <span className="roll-mask">
                    <span className="roll-track">
                      <span>Generate My Daily Plan</span>
                      <span aria-hidden="true">Generate My Daily Plan</span>
                    </span>
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Right Schedule & Impact */}
          <div className="space-y-6 lg:col-span-8">
            {/* Live Adoption Impact Tracker */}
            <div className="lofty-card bg-[#111111] p-6 text-white sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-5">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-white/75">
                    <span>{plan.location}</span>
                    <span aria-hidden="true">·</span>
                    <span>{aqiMeta.label}</span>
                    <span aria-hidden="true">·</span>
                    <span>{FAMILY_MODE_LABELS[familyMode].short} Mode</span>
                  </div>
                  <h3 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
                    Real-Time Impact of Your Checked Actions
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onResetAdoption}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/30 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-white/10"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Clear Checks</span>
                  </button>
                  <button
                    type="button"
                    onClick={onExportPlan}
                    className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#111111] bg-[#FFE14D] px-4 py-2 text-xs font-extrabold text-[#111111] transition-transform hover:-translate-y-0.5"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Save Plan (.md)</span>
                  </button>
                </div>
              </div>

              <div
                className={`grid grid-cols-2 gap-5 pt-5 ${
                  impact.monthlySavingsInr > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
                }`}
              >
                <div>
                  <div
                    data-testid="impact-co2-weekly"
                    className="mono-num text-3xl font-extrabold text-[#C8F542] sm:text-4xl"
                  >
                    {impact.weeklyCo2SavedKg} kg
                  </div>
                  <div className="mt-1 text-xs font-medium text-white/75">
                    Pollution cut / week ({impact.annualCo2SavedKg} kg/yr)
                  </div>
                </div>
                <div>
                  <div
                    data-testid="impact-pm25-cut"
                    className="mono-num text-3xl font-extrabold text-[#70D6FF] sm:text-4xl"
                  >
                    -{impact.indoorPm25CutPct}%
                  </div>
                  <div className="mt-1 text-xs font-medium text-white/75">
                    Less indoor smoke &amp; dust
                  </div>
                </div>
                {impact.monthlySavingsInr > 0 && (
                  <div>
                    <div
                      data-testid="impact-monthly-savings"
                      className="mono-num text-3xl font-extrabold text-[#FFE14D] sm:text-4xl"
                    >
                      ₹{impact.monthlySavingsInr}
                    </div>
                    <div className="mt-1 text-xs font-medium text-white/75">
                      Est. petrol &amp; power saved / mo
                    </div>
                  </div>
                )}
                <div>
                  <div
                    data-testid="impact-adopted-count"
                    className="mono-num text-3xl font-extrabold text-[#FF66B3] sm:text-4xl"
                  >
                    {impact.adoptedCount} of {impact.totalSelectableCount}
                  </div>
                  <div className="mt-1 text-xs font-medium text-white/75">
                    actions done
                  </div>
                </div>
              </div>
            </div>

            {isGenerating ? (
              <div
                aria-live="polite"
                className="lofty-card space-y-4 bg-white p-7"
                data-testid="plan-loading-skeleton"
              >
                <div className="flex items-center gap-3 text-sm font-bold text-[#111111]">
                  <Loader2 className="h-5 w-5 animate-spin text-[#3B66FF]" aria-hidden="true" />
                  <span>
                    Creating AI morning-to-evening schedule, outdoor windows &amp; commute swaps for{' '}
                    {input.location}...
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="h-28 animate-pulse rounded-2xl bg-[#111111]/10" />
                  <div className="h-28 animate-pulse rounded-2xl bg-[#111111]/10" />
                  <div className="h-28 animate-pulse rounded-2xl bg-[#111111]/10" />
                  <div className="h-28 animate-pulse rounded-2xl bg-[#111111]/10" />
                </div>
              </div>
            ) : (
              <>
                {/* 3 Key Guidance Cards: Best Outdoor Window, Outdoor Activities, Commute */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-[22px] border-2 border-[#111111] bg-[#70D6FF] p-5 shadow-[4px_4px_0px_#111111]">
                    <div className="flex items-center gap-2 text-xs font-extrabold tracking-wide text-[#111111] uppercase">
                      <Wind className="h-4 w-4" aria-hidden="true" />
                      <span>Best Outdoor Time</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed font-semibold text-[#111111]">
                      {plan.isBaseline
                        ? `${cleanestWindowLabel} (open opposite balcony doors briefly when afternoon sun lifts the haze; keep shut after evening traffic begins).`
                        : plan.bestVentilationWindow}
                    </p>
                  </div>

                  <div className="rounded-[22px] border-2 border-[#111111] bg-[#C8F542] p-5 shadow-[4px_4px_0px_#111111]">
                    <div className="flex items-center gap-2 text-xs font-extrabold tracking-wide text-[#111111] uppercase">
                      <Footprints className="h-4 w-4" aria-hidden="true" />
                      <span>Safer Outdoor Activity</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed font-semibold text-[#111111]">
                      {plan.isBaseline
                        ? `Shift kids’ society park play and elderly walks to ${cleanestWindowLabel}; avoid brisk running near main roads before 10 AM.`
                        : plan.outdoorActivityAdvice || plan.airAdvisory}
                    </p>
                  </div>

                  <div className="rounded-[22px] border-2 border-[#111111] bg-[#FFE14D] p-5 shadow-[4px_4px_0px_#111111]">
                    <div className="flex items-center gap-2 text-xs font-extrabold tracking-wide text-[#111111] uppercase">
                      <Bike className="h-4 w-4" aria-hidden="true" />
                      <span>Commute Advice</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed font-semibold text-[#111111]">
                      {plan.commuteAdvice || aqiMeta.posture}
                    </p>
                  </div>
                </div>

                {/* Family Age Breakdown Strip */}
                {plan.familyGuidance && (
                  <div className="rounded-[22px] border-2 border-[#111111] bg-white p-5">
                    <div className="mb-3 flex items-center gap-2 text-xs font-extrabold tracking-wide text-[#3B66FF] uppercase">
                      <Users className="h-4 w-4" aria-hidden="true" />
                      <span>Family Care By Age Group</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {(
                        [
                          { id: 'children', label: 'Children', text: plan.familyGuidance.children },
                          { id: 'adults', label: 'Adults', text: plan.familyGuidance.adults },
                          { id: 'elderly', label: 'Elderly', text: plan.familyGuidance.elderly },
                        ] as const
                      ).map((group) => (
                        <div
                          key={group.id}
                          className={`rounded-xl border-2 p-3.5 text-xs leading-relaxed ${
                            familyMode === group.id
                              ? 'border-[#111111] bg-[#FFE14D] font-bold text-[#111111]'
                              : 'border-[#111111]/20 bg-[#F7F5EE] text-[#22252A]'
                          }`}
                        >
                          <div className="mb-1 font-extrabold text-[#111111] uppercase">
                            {group.label}
                          </div>
                          <p>{group.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Morning, Afternoon, Night — one line each */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-extrabold tracking-wide text-[#111111] uppercase">
                      <ShieldCheck className="h-4 w-4 text-[#3B66FF]" aria-hidden="true" />
                      <span>Morning · Afternoon · Night</span>
                    </div>
                    <span className="text-xs font-semibold text-[#444444]">
                      Tick steps to update live impact
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {plan.dailyRoutine.map((step) => {
                      const isChecked = adoptedSet.has(step.id);
                      return (
                        <div
                          key={step.id}
                          className={`flex flex-col justify-between rounded-[22px] border-2 border-[#111111] p-5 transition-all ${
                            isChecked
                              ? 'bg-[#C8F542] shadow-[5px_5px_0px_#111111]'
                              : 'bg-white hover:bg-[#F7F5EE]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="mono-num text-xs font-extrabold tracking-wide text-[#3B66FF] uppercase">
                                {step.period}
                              </span>
                              <button
                                type="button"
                                aria-pressed={isChecked}
                                aria-label={`Adopt routine: ${step.period}`}
                                onClick={() => onToggleAdopt(step.id)}
                                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border-2 border-[#111111] px-3 text-xs font-extrabold transition-colors ${
                                  isChecked
                                    ? 'bg-[#111111] text-white'
                                    : 'bg-[#F7F5EE] text-[#111111] hover:bg-[#FFE14D]'
                                }`}
                              >
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>{isChecked ? 'Done' : 'Tick Step'}</span>
                              </button>
                            </div>

                            <p className="mt-3 text-sm leading-snug font-semibold text-[#111111]">
                              {step.action}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
