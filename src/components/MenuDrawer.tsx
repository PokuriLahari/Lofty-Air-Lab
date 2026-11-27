import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { PlanTabId } from '../types/air';

interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
  onNavigateSection: (target: 'air-intelligence' | PlanTabId) => void;
}

const MENU_LINKS: Array<{ id: 'air-intelligence' | PlanTabId; href: string; label: string }> = [
  { id: 'air-intelligence', href: '#air-intelligence', label: '01 · Air Intelligence' },
  { id: 'daily-plan', href: '#daily-plan', label: '02 · My Daily Plan' },
  { id: 'indoor-wellness', href: '#indoor-wellness', label: '03 · Indoor Wellness' },
  { id: 'sustainable-living', href: '#sustainable-living', label: '04 · Sustainable Living' },
  { id: 'ask-chatbot', href: '#ask-chatbot', label: '05 · Ask Chatbot' },
];

export function MenuDrawer({ open, onClose, onNavigateSection }: MenuDrawerProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/70 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Site Navigation Menu"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lofty-card w-full max-w-xl space-y-7 bg-[#FFE14D] p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl font-extrabold text-[#111111]">
            Lofty Air Lab · Sections
          </span>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="roll-btn bg-[#111111] px-4 py-2 text-xs text-white"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Close</span>
          </button>
        </div>

        <nav className="font-display flex flex-col gap-3 text-3xl font-extrabold text-[#111111] sm:text-4xl">
          {MENU_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                onClose();
                onNavigateSection(item.id);
              }}
              className="rounded-xl px-2 py-1 transition-transform hover:translate-x-2"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
