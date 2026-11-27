# Lofty Air Lab — Urban Air Quality & Low-Emission Family Assistant

**Lofty Air Lab** is an environmental intelligence web application built for Indian high-rise apartment families and gated societies. Instead of overwhelming residents with raw atmospheric dashboards, it delivers one clear safety verdict in 10 seconds, identifies the cleanest 2-hour daylight window from live air-quality forecasts, and turns pollution readings into practical daily routines, low-cost indoor air hacks, sustainable swaps, and multilingual Q&A.

---

## 1. Chosen Vertical

**Environmental Intelligence, Sustainable Urban Living & Preventive Family Health (India Urban Apartment Focus)**

Urban air pollution in Indian cities spikes sharply across morning/evening traffic inversions, winter smog, road dust, and indoor cooking emissions. Most AQI apps stop at a raw index number. Lofty Air Lab bridges the gap between **live environmental telemetry** and **everyday household action** for families living in apartments (`Whole Flat`, `Children`, `Adults`, and `Elderly`).

---

## 2. Approach and Logic

### A. "10-Second Answer First" UX
Users land directly on a single, scannable verdict card answering three practical questions:
1. **Is it safe for me to go out now?** (`Good to go` / `Go easy` / `Stay in`)
2. **When is the best time today?** (Single live-computed cleanest 2-hour daylight window shared consistently across Hero, Air Intelligence, Daily Plan, and Indoor Wellness)
3. **What should I do?** (Actionable plain-language steps)

### B. Hybrid Deterministic + GenAI Architecture
Critical health decisions **never rely on an LLM**—they are computed deterministically, while Gemini handles personalization, planning, and plain-language explanation:

1. **Deterministic Safety Verdict (`src/utils/verdictRules.ts`)**
   - Uses two user inputs—**Who is going out?** (`Adult`, `Child`, `Elderly`, `Asthma`) and **What are you doing?** (`Walk`, `Run`, `Outdoor Work`, `Errands`)—against live **PM2.5** thresholds:
     - `PM2.5 < 30 µg/m³`: **Good to go**
     - `PM2.5 30–60 µg/m³`: **Go easy** (stricter cautions for high-exertion outdoor work/running for sensitive profiles)
     - `PM2.5 60–100 µg/m³`: **Go easy** for healthy adults and gentle walks; **Stay in** for vulnerable users (`Child`, `Elderly`, `Asthma`) doing high-exertion activity (`Run`, `Outdoor Work`)
     - `PM2.5 100–150 µg/m³`: **Stay in** for vulnerable users or high exertion; **Go easy** (masked, short trips) for healthy adults on walks/errands
     - `PM2.5 > 150 µg/m³`: **Stay in** for everyone
   - Maps AQI onto a single unified 5-tier scale (`Good 0–50`, `Moderate 51–100`, `Poor 101–150`, `Unhealthy 151–200`, `Severe 200+`).

2. **Cleanest 2-Hour Daylight Window (`findCleanestTwoHourWindow`)**
   - Scans the next 24 hours of hourly Open-Meteo `pm2_5` forecast data (`Asia/Kolkata`) across daylight hours (`08:00–18:00`) to pick the contiguous 2-hour pair with the lowest average PM2.5, ensuring one consistent window across every section of the app.

3. **Weekly & Diurnal Trend Analysis (`01. Air Intelligence`)**
   - Aggregates 7 days of historical hourly PM2.5 readings from Open-Meteo into daily averages alongside the India 60 µg/m³ safe-limit reference line in a Recharts line graph, plus a 24-hour forecast view.

4. **GenAI Personalization, Indoor Wellness, Sustainable Swaps & Multilingual Chat (`@google/genai`)**
   - **Structured Daily Plan Generator (`POST /api/air-plan`):** Uses `gemini-3.1-flash-lite` with strict JSON `responseSchema` to tailor a 3-step **Morning / Afternoon / Night** schedule, **Family Mode** advice, 4 room-wise **Indoor Wellness** hacks (`Free`, `Under ₹500`, `DIY Under ₹2,000`), and 4 **Sustainable Living** swaps with estimated weekly pollution cuts (`kg/week`) and monthly savings (`₹/month`).
   - **Ask About the Air (`POST /api/air-chat`):** Uses `gemini-4-hydrogen` (`ThinkingLevel.LOW`) with `gemini-3.1-flash-lite` (`ThinkingLevel.MINIMAL`) fallback via multi-turn `ai.chats.create()`. Strictly grounded on fetched Open-Meteo numbers via system instructions so it never invents an AQI value and replies concisely in **English**, **Hindi (`हिन्दी`)**, or **Telugu (`తెలుగు`)**.
   - **Search Grounding Fallback (`POST /api/air-quality` / `POST /api/alerts`):** Falls back to `gemini-3.1-flash-lite` with `{ googleSearch: {} }` if Google Maps Air Quality REST returns restricted permissions (`403`).

---

## 3. How the Solution Works

```text
React + Vite + Tailwind + Recharts Frontend (src/)
   │
   ├── Hero & Air Intelligence ──▶ POST /api/open-meteo-air & GET /api/city-search
   │                               (Live Open-Meteo Air Quality + 7-day history + 24h curve)
   │
   ├── Your Plan for Today Tabs ──▶ POST /api/air-plan (Gemini JSON responseSchema)
   │   (Daily Plan, Indoor Wellness, Sustainable Living + live impact calculator)
   │
   ├── Ask About the Air ────────▶ POST /api/air-chat (Gemini multi-turn grounded chat)
   │                               (English / हिन्दी / తెలుగు + Family Mode)
   │
   └── Pin-Drop Smog Alerts ─────▶ Google Maps JS API (@vis.gl/react-google-maps)
                                   + POST /api/maps-config, /api/geocode, /api/air-quality, /api/alerts
```

- **Unified Express + Vercel Serverless Architecture:**
  - `server-app.ts` defines all `/api/*` endpoints cleanly.
  - `server.ts` mounts `createApiApp()` with Vite dev middleware (development) or static `dist/` serving (Node production via `npm start`).
  - `api/index.ts` and `vercel.json` expose the exact same Express app as a Vercel Serverless Function for `/api/*` alongside the static Vite frontend.

### Running Locally & Deploying
1. Install dependencies: `npm install`
2. Set environment variables (see `.env.example`):
   - `GEMINI_API_KEY` — Required for `/api/air-chat`, `/api/air-plan`, and Search Grounding fallback.
   - `GOOGLE_MAPS_API_KEY` and `VITE_GOOGLE_MAPS_API_KEY` — Required for interactive Google Maps pin-drop alerts and Geocoding/Air Quality lookups.
3. Development: `npm run dev` (starts Express + Vite on port `3000`)
4. Build & Verify: `npm run build`, `npm run lint`, and unit tests via `npx tsx --test src/utils/verdictRules.test.ts src/utils/airImpact.test.ts src/utils/alertLogic.test.ts`

---

## 4. Assumptions Made

1. **PM2.5 Safe Limit & Unified Scale:** Ambient safe-limit messaging uses India's 24-hour NAAQS benchmark of **60 µg/m³** (`"Safe limit 60 — above this, air is unhealthy"`), while the 5-band badge (`0–50`, `51–100`, `101–150`, `151–200`, `200+`) uses a unified numeric scale synced with Open-Meteo's `us_aqi` reading (or an estimated `PM2.5 × 2.1` fallback if `us_aqi` is absent).
2. **Daylight Window Bounds:** Cleanest outdoor/ventilation window selection restricts candidates to **8:00 AM – 6:00 PM IST** (`hour >= 8 && hour <= 17`), assuming families avoid middle-of-the-night outdoor walks or leaving flat doors open overnight even if late-night concentrations dip.
3. **Real-Time Savings & Reduction Estimates (`src/utils/airImpact.ts`):** Weekly emission reductions (`kg/week`), indoor dust/smoke reductions (capped at realistic household bounds up to `65%`), and monthly rupee savings (`₹/month`) are heuristic apartment-level estimates scaled by the user's checked routine steps, indoor hacks, and sustainable swaps—not metered utility readings.
4. **In-Memory Alert Subscriptions:** Alert preferences are persisted client-side in `localStorage` and mirrored in memory per server instance (`/api/alerts`), assuming lightweight single-household usage without user login or an external database.
5. **External API & Key Availability:** Live forecasts depend on Open-Meteo availability; if a city reading is temporarily unavailable, the UI displays an honest unavailable notice rather than fabricating telemetry. On Vercel deployments, `GEMINI_API_KEY` and `GOOGLE_MAPS_API_KEY` / `VITE_GOOGLE_MAPS_API_KEY` must be configured in project environment variables (and `.vercel.app` domains whitelisted if the Maps key uses HTTP referrer restrictions).
