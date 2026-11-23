import { Menu } from 'lucide-react';
import type { PlanTabId } from '../types/air';

interface NavbarProps {
  onOpenMenu: () => void;
  onNavigateSection: (target: 'air-intelligence' | PlanTabId) => void;
}

const NAV_ITEMS: Array<{ id: 'air-intelligence' | PlanTabId; href: string; label: string }> = [
  { id: 'air-intelligence', href: '#air-intelligence', label: 'Air Intelligence' },
  { id: 'daily-plan', href: '#daily-plan', label: 'My Daily Plan' },
  { id: 'indoor-wellness', href: '#indoor-wellness', label: 'Indoor Wellness' },
  { id: 'sustainable-living', href: '#sustainable-living', label: 'Sustainable Living' },
  { id: 'ask-chatbot', href: '#ask-chatbot', label: 'Ask Chatbot' },
];

export function Navbar({ onOpenMenu, onNavigateSection }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 px-4 pt-3 pb-2 sm:px-6">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-8 rounded-full border-2 border-[#111111] bg-white/95 px-5 shadow-[4px_4px_0px_#111111] backdrop-blur-md sm:px-7">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          className="font-display shrink-0 whitespace-nowrap text-lg font-extrabold tracking-tight text-[#111111] sm:text-xl"
        >
          Lofty Air Lab
        </a>

        {/* Zone 2: Five Primary Navigation Sections */}
        <nav
          className="hidden items-center gap-6 text-sm font-bold text-[#111111] lg:flex"
          aria-label="Primary Navigation"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                onNavigateSection(item.id);
              }}
              className="shrink-0 whitespace-nowrap transition-colors hover:text-[#3B66FF]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open navigation menu"
            className="roll-btn bg-[#111111] px-5 py-2 text-xs text-white sm:text-sm"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
            <span className="roll-mask">
              <span className="roll-track">
                <span>Menu</span>
                <span aria-hidden="true">Menu</span>
              </span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
