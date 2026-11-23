import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Leaf, X } from 'lucide-react';
import {
  CLEAN_AIR_ENGINES,
  COMMUNITY_HABITS,
  COMMUNITY_PLAYBOOKS,
  type PlaybookItem,
} from '../data/loftyContent';
import type { AirPlannerInput, GeneratedAirPlan } from '../types/air';

interface SustainableLivingSectionProps {
  plan: GeneratedAirPlan;
  adoptedIds: string[];
  onToggleAdopt: (itemId: string) => void;
  onApplyPreset: (preset: AirPlannerInput, title: string) => void;
  onAddFocusHint: (hint: string) => void;
}

export function SustainableLivingSection({
  plan,
  adoptedIds,
  onToggleAdopt,
  onApplyPreset,
  onAddFocusHint,
}: SustainableLivingSectionProps) {
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookItem | null>(null);
  const adoptedSet = new Set(adoptedIds);

  useEffect(() => {
    if (!selectedPlaybook) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPlaybook(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedPlaybook]);

  return (
    <div id="sustainable-living">
      {/* Top Part: Eco-Friendly Alternatives & Low-Emission Swaps */}
      <div className="bg-[#F7F5EE] px-4 pt-6 pb-16 sm:px-6 sm:pt-8 sm:pb-20">
        <div className="mx-auto max-w-[1320px] space-y-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-2xl space-y-2">
              <p className="mono-num text-xs font-bold tracking-wider text-[#FF6B35] uppercase">
                04. Sustainable Living
              </p>
              <h2 className="font-display-tight text-4xl font-extrabold text-[#111111] sm:text-6xl">
                Low-emission swaps &amp; real impact
              </h2>
              <p className="text-base leading-relaxed text-[#444444]">
                Practical alternatives to pollution-heavy routines—from solo commutes to open-flame
                heating and dry leaf burning—with clear impact on emissions and family savings.
              </p>
            </div>
          </div>

          {/* Swaps Cards */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {plan.sustainableSwaps.map((swap) => {
              const isChecked = adoptedSet.has(swap.id);
              return (
                <article
                  key={swap.id}
                  className={`rounded-[22px] border-2 border-[#111111] p-6 transition-all ${
                    isChecked
                      ? 'bg-[#FFE14D] shadow-[5px_5px_0px_#111111]'
                      : 'bg-white hover:bg-[#FFE14D]/25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-[#3B66FF] uppercase">
                      <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{swap.category}</span>
                    </span>
                    <button
                      type="button"
                      aria-pressed={isChecked}
                      aria-label={`Adopt swap: ${swap.switchTo}`}
                      onClick={() => onToggleAdopt(swap.id)}
                      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border-2 border-[#111111] px-3 text-xs font-extrabold ${
                        isChecked
                          ? 'bg-[#111111] text-white'
                          : 'bg-[#F7F5EE] text-[#111111] hover:bg-[#C8F542]'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{isChecked ? 'Swapped' : 'Adopt Swap'}</span>
                    </button>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="text-xs font-semibold text-[#555555] line-through">
                      Instead of: {swap.insteadOf}
                    </div>
                    <h3 className="font-display text-xl font-extrabold text-[#111111] sm:text-2xl">
                      Switch to: {swap.switchTo}
                    </h3>
                  </div>

                  <div className="mono-num mt-3 flex flex-wrap gap-3 text-xs font-bold text-[#111111]">
                    <span>-{swap.co2SavedKgPerWeek} kg pollution cut/wk</span>
                    <span aria-hidden="true">·</span>
                    <span>₹{swap.monthlySavingsInr}/mo saved</span>
                    <span aria-hidden="true">·</span>
                    <span>-{swap.pm25ReductionPct}% smoke &amp; dust</span>
                  </div>

                  <p className="mt-3 border-t border-[#111111]/15 pt-3 text-xs leading-relaxed text-[#22252A]">
                    <strong className="font-extrabold text-[#111111]">Why it matters:</strong>{' '}
                    {swap.directImpactExplanation}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dark Four Everyday Action Areas */}
      <div className="border-t-2 border-[#111111] bg-[#111111] px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="mx-auto max-w-[1200px] space-y-12">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="space-y-2">
              <p className="mono-num text-xs font-bold tracking-wider text-[#C8F542] uppercase">
                Household Habit Pillars
              </p>
              <h3 className="font-display-tight text-4xl font-extrabold text-white sm:text-5xl">
                Pin any habit directly to your plan
              </h3>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
              Pick an area below to include its low-emission habits next time you refresh your
              schedule.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
            {CLEAN_AIR_ENGINES.map((engine, idx) => (
              <article
                key={engine.id}
                className="lofty-card flex flex-col justify-between gap-6 p-6 text-[#111111] sm:p-8"
                style={{ backgroundColor: engine.bg }}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="mono-num text-xs font-extrabold tracking-wider text-[#111111]/80 uppercase">
                      0{idx + 1}. Focus Area
                    </span>
                    <button
                      type="button"
                      onClick={() => onAddFocusHint(engine.focusHint)}
                      aria-label={`Add ${engine.title} to daily plan`}
                      className="inline-flex items-center gap-1 rounded-full border-2 border-[#111111] bg-white px-3.5 py-1.5 text-xs font-extrabold text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
                    >
                      <span>Add to Plan</span>
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <h4 className="font-display-tight text-3xl font-extrabold text-[#111111] sm:text-4xl">
                    {engine.title}
                  </h4>
                  <p className="text-sm leading-relaxed font-medium text-[#111111]/85 sm:text-base">
                    {engine.desc}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {engine.items.map((item, i) => (
                    <div
                      key={item}
                      className="flex items-center gap-2.5 rounded-xl border-2 border-[#111111] bg-white px-3.5 py-2.5 text-xs font-bold text-[#111111]"
                    >
                      <span className="mono-num text-[11px] font-extrabold text-[#3B66FF]">
                        0{i + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Pin Cloud */}
      <div className="overflow-hidden border-t-2 border-[#111111] bg-[#FFE14D] px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1160px] space-y-7 text-center">
          <div className="space-y-2">
            <p className="mono-num text-xs font-bold tracking-wider text-[#111111]/80 uppercase">
              Quick-Pin Habits
            </p>
            <h3 className="font-display-tight text-3xl font-extrabold text-[#111111] sm:text-5xl">
              Small changes that protect every floor
            </h3>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 py-2 sm:gap-5">
            {COMMUNITY_HABITS.map((habit) => (
              <button
                key={habit.label}
                type="button"
                onClick={() => onAddFocusHint(habit.label)}
                className="power-pill"
                style={{
                  backgroundColor: habit.bg,
                  color: habit.dark ? '#FFFFFF' : '#111111',
                  transform: `rotate(${habit.rot}deg)`,
                }}
              >
                <span aria-hidden="true">+</span>
                <span>{habit.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Society Playbooks Grid */}
      <div className="border-t-2 border-[#111111] bg-white px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-[1320px] space-y-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <p className="mono-num text-xs font-bold tracking-wider text-[#3B66FF] uppercase">
                Community Proof
              </p>
              <h3 className="font-display-tight text-3xl font-extrabold text-[#111111] sm:text-5xl">
                Society playbooks in action
              </h3>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-[#444444]">
              See how apartment towers cut traffic fumes and indoor smoke—click any playbook to load
              it into your daily plan.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {COMMUNITY_PLAYBOOKS.map((item) => (
              <article
                key={item.id}
                className="lofty-card lofty-card-hover flex flex-col justify-between gap-5 p-4 sm:p-5"
                style={{ backgroundColor: item.bg }}
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-[18px] border-2 border-[#111111] bg-[#111111]">
                  <img
                    src={item.img}
                    alt={item.imgAlt}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-4 text-white">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                      <span>{item.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="mono-num text-[#C8F542]">{item.stat}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-4 px-1">
                  <div>
                    <div className="mono-num text-[11px] font-bold text-[#111111]/75 uppercase">
                      {item.agencyLabel}
                    </div>
                    <h4 className="font-display mt-0.5 text-2xl font-extrabold text-[#111111] sm:text-3xl">
                      {item.title}
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPlaybook(item)}
                    aria-label={`View playbook: ${item.title}`}
                    className="roll-btn bg-white px-5 py-2.5 text-xs text-[#111111]"
                  >
                    <span className="roll-mask">
                      <span className="roll-track">
                        <span>View Playbook</span>
                        <span aria-hidden="true">View Playbook</span>
                      </span>
                    </span>
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* Playbook Detail Modal */}
      {selectedPlaybook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/75 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="playbook-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPlaybook(null);
          }}
        >
          <div className="lofty-card w-full max-w-2xl overflow-hidden bg-white">
            <div className="relative h-56 border-b-2 border-[#111111] bg-[#111111] sm:h-64">
              <img
                src={selectedPlaybook.img}
                alt={selectedPlaybook.imgAlt}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setSelectedPlaybook(null)}
                aria-label="Close playbook modal"
                className="roll-btn absolute top-4 right-4 bg-white px-3.5 py-1.5 text-xs text-[#111111]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Close</span>
              </button>
            </div>

            <div className="space-y-4 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#3B66FF]">
                <span>{selectedPlaybook.category}</span>
                <span aria-hidden="true">·</span>
                <span className="mono-num text-[#111111]">{selectedPlaybook.stat}</span>
              </div>

              <h3
                id="playbook-modal-title"
                className="font-display text-3xl font-extrabold text-[#111111] sm:text-4xl"
              >
                {selectedPlaybook.title}
              </h3>

              <p className="text-sm leading-relaxed text-[#33363E] sm:text-base">
                {selectedPlaybook.desc}
              </p>

              <div className="rounded-2xl border-2 border-[#111111] bg-[#F7F5EE] p-4 text-xs leading-relaxed text-[#111111] sm:text-sm">
                <strong className="font-extrabold">Why this works:</strong>{' '}
                {selectedPlaybook.impactDetail}
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onApplyPreset(selectedPlaybook.presetInput, selectedPlaybook.title);
                    setSelectedPlaybook(null);
                  }}
                  className="roll-btn bg-[#3B66FF] px-6 py-3 text-xs text-white sm:text-sm"
                >
                  <span className="roll-mask">
                    <span className="roll-track">
                      <span>Load Into My Daily Plan</span>
                      <span aria-hidden="true">Load Into My Daily Plan</span>
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
