import { ArrowUpRight } from 'lucide-react';
import { COMMUNITY_STORIES } from '../data/loftyContent';
import type { PlanTabId } from '../types/air';

interface ImpactAndStoriesSectionProps {
  onJumpToDailyPlan: () => void;
  onNavigateSection: (target: 'air-intelligence' | PlanTabId) => void;
}

const FOOTER_LINKS: Array<{ id: 'air-intelligence' | PlanTabId; href: string; label: string; hover: string }> = [
  { id: 'air-intelligence', href: '#air-intelligence', label: '01. Air Intelligence', hover: 'hover:text-[#FFE14D]' },
  { id: 'daily-plan', href: '#daily-plan', label: '02. My Daily Plan', hover: 'hover:text-[#FFE14D]' },
  { id: 'indoor-wellness', href: '#indoor-wellness', label: '03. Indoor Wellness', hover: 'hover:text-[#C8F542]' },
  { id: 'sustainable-living', href: '#sustainable-living', label: '04. Sustainable Living', hover: 'hover:text-[#FF66B3]' },
  { id: 'ask-chatbot', href: '#ask-chatbot', label: '05. Ask Chatbot', hover: 'hover:text-[#70D6FF]' },
];

export function ImpactAndStoriesSection({
  onJumpToDailyPlan,
  onNavigateSection,
}: ImpactAndStoriesSectionProps) {
  const currentStory = COMMUNITY_STORIES[0];

  return (
    <>
      {/* Verified Outcomes & Impact Metrics */}
      <section id="impact" className="border-t-2 border-[#111111] bg-white px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-[1320px] space-y-14">
          <div className="lofty-card space-y-8 bg-[#111111] p-8 text-white sm:p-12">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-5">
              <span className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                REAL APARTMENT RESULTS
              </span>
              <span className="mono-num text-xs font-bold text-[#FFE14D]">
                WHAT SIMPLE HABITS ACHIEVE
              </span>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="space-y-1">
                <div className="font-display mono-num text-5xl font-extrabold text-[#C8F542] sm:text-6xl">
                  -65%
                </div>
                <div className="text-sm font-medium text-white/80 sm:text-base">
                  Less indoor dust &amp; smoke with a DIY fan filter + chimney-first cooking
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-display mono-num text-5xl font-extrabold text-[#FF66B3] sm:text-6xl">
                  18.4 kg
                </div>
                <div className="text-sm font-medium text-white/80 sm:text-base">
                  Less neighborhood pollution weekly from tower carpools &amp; no-burn pacts
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-display mono-num text-5xl font-extrabold text-[#FFE14D] sm:text-6xl">
                  ₹2,400/mo
                </div>
                <div className="text-sm font-medium text-white/80 sm:text-base">
                  Typical family savings on petrol, cooking gas, and heater electricity bills
                </div>
              </div>
            </div>
          </div>

          {/* Single Society Story */}
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="mono-num text-xs font-bold tracking-wider text-[#3B66FF] uppercase">
                Society Stories
              </p>
              <h2 className="font-display-tight text-4xl font-extrabold text-[#111111] sm:text-5xl">
                Simple routines, fresher flats
              </h2>
            </div>

            <div className="lofty-card grid grid-cols-1 items-center gap-8 bg-[#F7F5EE] p-7 sm:p-10 md:grid-cols-12">
              <div className="flex justify-center md:col-span-4">
                <div
                  className="-rotate-2 rounded-[22px] border-2 border-[#111111] p-2.5 shadow-[5px_5px_0px_#111111]"
                  style={{ backgroundColor: currentStory.accent }}
                >
                  <img
                    src={currentStory.img}
                    alt={`${currentStory.name}, ${currentStory.role}`}
                    referrerPolicy="no-referrer"
                    className="h-48 w-48 rounded-[14px] border-2 border-[#111111] object-cover sm:h-56 sm:w-56"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>

              <div className="space-y-5 md:col-span-8">
                <div className="mono-num text-xs font-bold text-[#111111]">
                  {currentStory.outcome}
                </div>

                <blockquote className="font-display text-2xl leading-snug font-extrabold text-[#111111] sm:text-3xl">
                  {currentStory.quote}
                </blockquote>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-[#111111]/15 pt-4">
                  <div>
                    <div className="font-display text-xl font-extrabold text-[#111111]">
                      {currentStory.name}
                    </div>
                    <div className="text-sm font-medium text-[#444444]">{currentStory.role}</div>
                  </div>
                  <span className="mono-num text-xs font-bold text-[#3B66FF]">
                    {currentStory.location}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t-2 border-[#111111] bg-[#3B66FF] px-4 py-20 text-center text-white sm:px-6 sm:py-24">
        <div className="mx-auto max-w-[960px] space-y-6">
          <h2 className="font-display-tight text-5xl font-extrabold text-white sm:text-7xl">
            Ready for <span className="text-[#FFE14D]">fresher</span> air in your flat?
          </h2>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
            Make a plain-English daily checklist for your family in seconds and share it with your
            apartment tower.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onJumpToDailyPlan}
              className="roll-btn bg-[#C8F542] px-9 py-4 text-base text-[#111111] sm:text-lg"
            >
              <span className="roll-mask">
                <span className="roll-track">
                  <span>Make My Flat Air Plan</span>
                  <span aria-hidden="true">Make My Flat Air Plan</span>
                </span>
              </span>
              <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="border-t-2 border-[#111111] bg-[#111111] px-4 pt-14 pb-10 text-white sm:px-6">
        <div className="mx-auto max-w-[1320px] space-y-10">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div className="space-y-2">
              <div className="font-display text-3xl font-extrabold text-[#FFE14D]">
                Lofty Air Lab
              </div>
              <p className="max-w-md text-sm text-white/75">
                Helping Indian high-rise families and gated societies breathe easier with simple,
                practical daily routines.
              </p>
            </div>

            <nav className="flex flex-wrap gap-6 text-sm font-bold text-white/90" aria-label="Footer Navigation">
              {FOOTER_LINKS.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateSection(item.id);
                  }}
                  className={item.hover}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="mono-num flex flex-col items-center justify-between gap-3 border-t border-white/15 pt-6 text-xs text-white/60 sm:flex-row">
            <span>© 2026 Lofty Air Lab</span>
            <span>Simple daily routines &amp; clean-air hacks for Indian apartments</span>
          </div>
        </div>
      </footer>
    </>
  );
}
