import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Globe, Loader2, MessageSquare, Send, Users } from 'lucide-react';
import type {
  ChatLanguage,
  ChatTurn,
  FamilyMode,
  LocalAirReading,
  SafetyVerdict,
} from '../types/air';
import { FAMILY_MODE_LABELS, VALID_FAMILY_MODES } from '../utils/airImpact';
import { CHAT_LANGUAGE_OPTIONS, formatShortCityName } from '../utils/verdictRules';

interface AskChatbotSectionProps {
  liveLocationLabel: string;
  liveReading: LocalAirReading;
  verdict: SafetyVerdict;
  familyMode: FamilyMode;
  chatLanguage: ChatLanguage;
  onChangeFamilyMode: (mode: FamilyMode) => void;
  onChangeLanguage: (lang: ChatLanguage) => void;
  chatHistory: ChatTurn[];
  isChatLoading: boolean;
  chatError: string | null;
  onSendChat: (question: string) => Promise<void>;
  onClearChat: () => void;
}

const STARTER_QUESTIONS_BY_LANG: Record<ChatLanguage, string[]> = {
  en: [
    'Is it safe for a child with asthma to go out right now?',
    'Explain what today’s PM2.5, PM10, O3, and NO2 numbers mean.',
    'When is the cleanest 2-hour window to walk today?',
    'Should we open apartment windows or keep them shut?',
    'What indoor air hacks work fast without buying an expensive purifier?',
  ],
  hi: [
    'क्या अभी बाहर टहलना सुरक्षित है?',
    'आज का AQI और PM2.5 आसान शब्दों में समझाएं।',
    'बच्चों और बुजुर्गों के लिए आज क्या सावधानी रखें?',
    'आज घर की खिड़कियां खोलने का सबसे सही समय क्या है?',
  ],
  te: [
    'ఇప్పుడు బయటకు వెళ్లడం సురక్షితమేనా?',
    'ఈరోజు AQI మరియు PM2.5 విలువలను సులభంగా వివరించండి.',
    'పిల్లలు మరియు వృద్ధులు ఈరోజు ఏ జాగ్రత్తలు తీసుకోవాలి?',
    'ఇంటి కిటికీలు తెరవడానికి ఈరోజు అత్యుత్తమ సమయం ఎప్పుడు?',
  ],
};

export function AskChatbotSection({
  liveLocationLabel,
  liveReading,
  verdict,
  familyMode,
  chatLanguage,
  onChangeFamilyMode,
  onChangeLanguage,
  chatHistory,
  isChatLoading,
  chatError,
  onSendChat,
  onClearChat,
}: AskChatbotSectionProps) {
  const [question, setQuestion] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [chatHistory.length, isChatLoading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isChatLoading) return;
    setQuestion('');
    await onSendChat(trimmed);
  };

  const suggestions = STARTER_QUESTIONS_BY_LANG[chatLanguage] ?? STARTER_QUESTIONS_BY_LANG.en;

  return (
    <div
      id="ask-chatbot"
      className="border-t-2 border-[#111111] bg-[#70D6FF]/25 px-4 pt-8 pb-16 sm:px-6 sm:pt-10 sm:pb-20"
    >
      <div className="mx-auto max-w-[1160px] space-y-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl space-y-2">
            <p className="mono-num text-xs font-bold tracking-wider text-[#3B66FF] uppercase">
              05. Ask About The Air
            </p>
            <h2 className="font-display-tight text-4xl font-extrabold text-[#111111] sm:text-6xl">
              Ask about the air
            </h2>
            <p className="text-base leading-relaxed text-[#33363E]">
              Grounded strictly on live Open-Meteo data—never invents numbers. Get clear 2–3
              sentence answers in English, Hindi (हिन्दी), or Telugu (తెలుగు).
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col items-start gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-[#111111] uppercase">
                <Globe className="h-3.5 w-3.5 text-[#3B66FF]" aria-hidden="true" />
                <span>Language</span>
              </span>
              <div
                role="group"
                aria-label="Chat Language"
                className="flex flex-wrap gap-1 rounded-2xl border-2 border-[#111111] bg-white p-1"
              >
                {CHAT_LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={chatLanguage === opt.id}
                    onClick={() => onChangeLanguage(opt.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-extrabold whitespace-nowrap transition-colors ${
                      chatLanguage === opt.id
                        ? 'border border-[#111111] bg-[#3B66FF] text-white'
                        : 'border border-transparent text-[#33363E] hover:bg-[#F7F5EE]'
                    }`}
                  >
                    {opt.nativeLabel}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-start gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-[#111111] uppercase">
                <Users className="h-3.5 w-3.5 text-[#3B66FF]" aria-hidden="true" />
                <span>Family Mode</span>
              </span>
              <div
                role="group"
                aria-label="Chatbot Family Mode"
                className="flex flex-wrap gap-1 rounded-2xl border-2 border-[#111111] bg-white p-1"
              >
                {VALID_FAMILY_MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={familyMode === m}
                    onClick={() => onChangeFamilyMode(m)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-extrabold whitespace-nowrap transition-colors ${
                      familyMode === m
                        ? 'border border-[#111111] bg-[#FFE14D] text-[#111111]'
                        : 'border border-transparent text-[#33363E] hover:bg-[#F7F5EE]'
                    }`}
                  >
                    {FAMILY_MODE_LABELS[m].short}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Chatbot Container */}
        <div className="lofty-card space-y-5 bg-white p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#111111]/10 pb-4">
            <div
              data-testid="chatbot-status-bar"
              className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#33363E]"
            >
              <MessageSquare className="h-4 w-4 text-[#3B66FF]" aria-hidden="true" />
              <span className="text-[#111111]">{formatShortCityName(liveLocationLabel)}</span>
              <span aria-hidden="true">·</span>
              <span className="mono-num">
                AQI {liveReading.stationUnavailable ? 'Unavailable' : liveReading.aqi}
              </span>
              <span aria-hidden="true">·</span>
              <span className="rounded bg-[#FFE14D] px-2 py-0.5 text-[#111111]">{verdict}</span>
            </div>

            {chatHistory.length > 0 && (
              <button
                type="button"
                onClick={onClearChat}
                disabled={isChatLoading}
                className="rounded-full border-2 border-[#111111] bg-[#F7F5EE] px-3.5 py-1 text-xs font-extrabold text-[#111111] hover:bg-[#FFE14D]"
              >
                Clear Chat
              </button>
            )}
          </div>

          {/* Starter Questions */}
          <div className="flex flex-wrap gap-2">
            {suggestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void onSendChat(q)}
                disabled={isChatLoading}
                className="rounded-full border border-[#111111] bg-[#F7F5EE] px-3.5 py-1.5 text-left text-xs font-bold text-[#111111] transition-colors hover:bg-[#FFE14D]"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Scrollable Multi-Turn Conversation */}
          <div
            ref={scrollRef}
            className="max-h-96 space-y-3 overflow-y-auto rounded-2xl border-2 border-[#111111]/15 bg-[#F7F5EE] p-4"
            aria-live="polite"
          >
            {chatHistory.length === 0 ? (
              <p className="p-2 text-sm leading-relaxed text-[#4A4E57]">
                Ask anything about {liveLocationLabel}’s live air quality—whether it is safe to go
                for a walk or run, why vulnerable users should stay indoors, or what indoor hacks
                cut smoke right now. Replies stay concise (2–3 sentences) and cite only fetched{' '}
                {liveReading.source || 'Open-Meteo'} readings.
              </p>
            ) : (
              chatHistory.map((turn) => (
                <div
                  key={turn.id}
                  className={`rounded-2xl border-2 border-[#111111] p-4 text-sm leading-relaxed ${
                    turn.role === 'user'
                      ? 'ml-6 bg-[#FFE14D] font-semibold text-[#111111]'
                      : 'mr-6 bg-white text-[#111111]'
                  }`}
                >
                  <div className="mono-num mb-1 text-[11px] font-bold text-[#444444] uppercase">
                    {turn.role === 'user' ? 'You' : 'Ask About The Air'} · {turn.timestamp}
                  </div>
                  <div className="space-y-1.5">
                    {turn.content.split('\n').map((line, lineIdx) => {
                      const cleanLine = line.replace(/^\*\s+/, '• ');
                      const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);
                      return (
                        <p key={lineIdx} className="min-h-[1em]">
                          {parts.map((part, partIdx) =>
                            part.startsWith('**') && part.endsWith('**') ? (
                              <strong key={partIdx} className="font-extrabold">
                                {part.slice(2, -2)}
                              </strong>
                            ) : (
                              part
                            )
                          )}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
            {isChatLoading && (
              <div className="mr-6 flex items-center gap-2 rounded-2xl border-2 border-[#111111] bg-white p-4 text-sm font-semibold">
                <Loader2 className="h-4 w-4 animate-spin text-[#3B66FF]" aria-hidden="true" />
                <span>Reading fetched AQI numbers &amp; replying clearly...</span>
              </div>
            )}
          </div>

          {chatError && (
            <div
              role="alert"
              className="rounded-xl border-2 border-[#111111] bg-[#FF66B3]/25 px-4 py-2.5 text-xs font-bold text-[#111111]"
            >
              {chatError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2.5">
            <label htmlFor="chatbot-question-input" className="sr-only">
              Ask about the air in plain English, Hindi, or Telugu
            </label>
            <input
              id="chatbot-question-input"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                chatLanguage === 'hi'
                  ? 'हवा की गुणवत्ता के बारे में हिंदी में पूछें...'
                  : chatLanguage === 'te'
                    ? 'గాలి నాణ్యత గురించి తెలుగులో అడగండి...'
                    : 'Ask about AQI, safe outdoor times, or children/elderly care...'
              }
              maxLength={500}
              className="min-w-0 flex-1 rounded-full border-2 border-[#111111] bg-[#F7F5EE] px-5 py-3 text-sm font-medium text-[#111111] outline-none focus:bg-white"
            />
            <button
              type="submit"
              disabled={isChatLoading || question.trim().length < 3}
              className="roll-btn bg-[#3B66FF] px-6 py-3 text-xs text-white disabled:cursor-not-allowed disabled:bg-[#E2E8F0] disabled:text-[#475569] disabled:opacity-100 sm:text-sm"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>Ask</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
