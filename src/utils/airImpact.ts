import type {
  AirPlannerInput,
  CommuteMode,
  FamilyMode,
  GeneratedAirPlan,
  HeatingSource,
  HouseholdType,
  ImpactSummary,
  RoomFilterCategory,
  SmogSeverity,
} from '../types/air';

export const VALID_SEVERITIES: SmogSeverity[] = ['moderate', 'sensitive', 'severe', 'hazardous'];
export const VALID_FAMILY_MODES: FamilyMode[] = ['all', 'children', 'adults', 'elderly'];
export const VALID_HOUSEHOLDS: HouseholdType[] = [
  'family_kids',
  'multigen_seniors',
  'couple_solo',
  'shared_house',
];
export const VALID_HEATING: HeatingSource[] = [
  'gas_furnace',
  'wood_coal',
  'electric_heat_pump',
  'drafty_apartment',
];
export const VALID_COMMUTES: CommuteMode[] = [
  'gas_car',
  'public_transit',
  'bike_walk',
  'remote_home',
];

export const FAMILY_MODE_LABELS: Record<FamilyMode, { label: string; short: string; desc: string }> = {
  all: {
    label: 'Whole Flat (Balanced)',
    short: 'Whole Flat',
    desc: 'Balanced rules for living rooms, kitchens, and family travel.',
  },
  children: {
    label: 'Children & School Age',
    short: 'Children',
    desc: 'Focuses on play windows, school bus waits, and sleeping room dust.',
  },
  adults: {
    label: 'Working Adults & Commute',
    short: 'Adults',
    desc: 'Focuses on low-emission office travel, WFH rooms, and outdoor exercise.',
  },
  elderly: {
    label: 'Elderly & Breathing Care',
    short: 'Elderly',
    desc: 'Gentle midday walks, sealing drafts, and smoke-free quiet rooms.',
  },
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: AirPlannerInput;
}

export function validatePlannerInput(raw: Partial<AirPlannerInput>): ValidationResult {
  const location = typeof raw.location === 'string' ? raw.location.trim().slice(0, 120) : '';
  if (location.length < 2) {
    return {
      valid: false,
      error: 'Please enter your city, sector, or society area (at least 2 letters).',
    };
  }

  const smogSeverity: SmogSeverity = VALID_SEVERITIES.includes(raw.smogSeverity as SmogSeverity)
    ? (raw.smogSeverity as SmogSeverity)
    : 'severe';

  const familyMode: FamilyMode = VALID_FAMILY_MODES.includes(raw.familyMode as FamilyMode)
    ? (raw.familyMode as FamilyMode)
    : 'all';

  const household: HouseholdType = VALID_HOUSEHOLDS.includes(raw.household as HouseholdType)
    ? (raw.household as HouseholdType)
    : 'family_kids';

  const heating: HeatingSource = VALID_HEATING.includes(raw.heating as HeatingSource)
    ? (raw.heating as HeatingSource)
    : 'gas_furnace';

  const commute: CommuteMode = VALID_COMMUTES.includes(raw.commute as CommuteMode)
    ? (raw.commute as CommuteMode)
    : 'gas_car';

  const notes = typeof raw.notes === 'string' ? raw.notes.trim().slice(0, 480) : '';

  return {
    valid: true,
    sanitized: {
      location,
      smogSeverity,
      familyMode,
      household,
      heating,
      commute,
      notes,
    },
  };
}

export function classifyHackRoomCategory(roomFocus: string): Exclude<RoomFilterCategory, 'all'> {
  const lower = roomFocus.toLowerCase();
  if (/kitchen|stove|cooking|tadka/.test(lower)) return 'kitchen';
  if (/bedroom|sleep|kids|parents room/.test(lower)) return 'bedroom';
  if (/balcony|living|window|lounge|\bhall\b/.test(lower)) return 'living';
  return 'hallway';
}

export interface AqiTierMeta {
  id: SmogSeverity;
  label: string;
  aqiRange: string;
  posture: string;
  bgClass: string;
  textClass: string;
  hazeLevel: number;
}

export function getAqiTierMeta(severity: SmogSeverity): AqiTierMeta {
  switch (severity) {
    case 'moderate':
      return {
        id: 'moderate',
        label: 'Moderate',
        aqiRange: 'AQI 51–100',
        posture: 'Open balcony midday · Normal society walks OK',
        bgClass: 'bg-[#FFE14D]',
        textClass: 'text-[#111111]',
        hazeLevel: 0.25,
      };
    case 'sensitive':
      return {
        id: 'sensitive',
        label: 'Poor',
        aqiRange: 'AQI 101–150',
        posture: 'Skip heavy outdoor runs · Run kitchen chimney',
        bgClass: 'bg-[#FF6B35]',
        textClass: 'text-white',
        hazeLevel: 0.45,
      };
    case 'severe':
      return {
        id: 'severe',
        label: 'Unhealthy',
        aqiRange: 'AQI 151–200',
        posture: 'Shut balcony sliders · Wet mop floors · N95 outside',
        bgClass: 'bg-[#FF66B3]',
        textClass: 'text-[#111111]',
        hazeLevel: 0.72,
      };
    case 'hazardous':
      return {
        id: 'hazardous',
        label: 'Severe',
        aqiRange: 'AQI 200+',
        posture: 'Keep doors sealed · Clean bedroom air · Zero morning walks',
        bgClass: 'bg-[#FF3B5C]',
        textClass: 'text-white',
        hazeLevel: 0.92,
      };
  }
}

export function calculateAdoptedImpact(
  plan: GeneratedAirPlan,
  adoptedIds: string[]
): ImpactSummary {
  const adoptedSet = new Set(adoptedIds);
  const selectableIds = [
    ...plan.dailyRoutine.map((r) => r.id),
    ...plan.indoorHacks.map((h) => h.id),
    ...plan.sustainableSwaps.map((s) => s.id),
  ];
  const totalSelectableCount = selectableIds.length;

  let weeklyCo2 = 0;
  let pm25Cumulative = 0;
  let monthlySavings = 0;
  let adoptedCount = 0;

  for (const r of plan.dailyRoutine) {
    if (adoptedSet.has(r.id)) {
      adoptedCount += 1;
      weeklyCo2 += Math.max(0, Number(r.co2SavedKgPerWeek) || 0);
      pm25Cumulative += Math.max(0, Number(r.pm25ReductionPct) || 0);
    }
  }

  for (const h of plan.indoorHacks) {
    if (adoptedSet.has(h.id)) {
      adoptedCount += 1;
      pm25Cumulative += Math.max(0, Number(h.pm25ReductionPct) || 0);
    }
  }

  for (const s of plan.sustainableSwaps) {
    if (adoptedSet.has(s.id)) {
      adoptedCount += 1;
      weeklyCo2 += Math.max(0, Number(s.co2SavedKgPerWeek) || 0);
      monthlySavings += Math.max(0, Number(s.monthlySavingsInr) || 0);
      pm25Cumulative += Math.max(0, Number(s.pm25ReductionPct) || 0);
    }
  }

  const indoorPm25CutPct = Math.min(78, Math.round(pm25Cumulative * 0.65));
  const adoptionPct =
    totalSelectableCount > 0 ? Math.round((adoptedCount / totalSelectableCount) * 100) : 0;
  const skyClarityScore = Math.min(1, Number((0.15 + (adoptionPct / 100) * 0.85).toFixed(2)));

  return {
    adoptedCount,
    totalSelectableCount,
    adoptionPct,
    weeklyCo2SavedKg: Number(weeklyCo2.toFixed(1)),
    annualCo2SavedKg: Math.round(weeklyCo2 * 52),
    indoorPm25CutPct,
    monthlySavingsInr: Math.round(monthlySavings),
    skyClarityScore,
  };
}

export function mergeHabitIntoNotes(currentNotes: string, habitText: string): string {
  const cleanHabit = habitText.trim();
  if (!cleanHabit) return currentNotes;
  const trimmed = currentNotes.trim();
  if (!trimmed) return `Priority focus: ${cleanHabit}`;
  if (trimmed.toLowerCase().includes(cleanHabit.toLowerCase())) {
    return trimmed;
  }
  return `${trimmed}; ${cleanHabit}`;
}

export function formatPlanMarkdown(plan: GeneratedAirPlan, adoptedIds: string[]): string {
  const adopted = new Set(adoptedIds);
  const impact = calculateAdoptedImpact(plan, adoptedIds);
  const lines: string[] = [
    `# Lofty Air Lab · Home Clean-Air Checklist (${plan.location})`,
    ``,
    `**Today's Air Advice:** ${plan.airAdvisory}`,
    `**Best Balcony / Window Time:** ${plan.bestVentilationWindow}`,
    `**Safer Outdoor & Commute Note:** ${plan.outdoorActivityAdvice ?? ''} ${plan.commuteAdvice ?? ''}`.trim(),
    `**Your Impact:** ${impact.weeklyCo2SavedKg} kg pollution cut/week · -${impact.indoorPm25CutPct}% indoor smoke & dust · ₹${impact.monthlySavingsInr}/month saved`,
    ``,
    `## Daily Clean-Air Routine`,
    ...plan.dailyRoutine.map(
      (r) =>
        `- [${adopted.has(r.id) ? 'x' : ' '}] **${r.timeSlot} (${r.period}) — ${r.title}**: ${r.action} _(${r.whyItHelps})_`
    ),
    ``,
    `## Easy Indoor Air Hacks`,
    ...plan.indoorHacks.map(
      (h) =>
        `- [${adopted.has(h.id) ? 'x' : ' '}] **${h.title}** (${h.roomFocus} · ${h.costTier}): ${h.impactMetric} — ${h.explanation}`
    ),
    ``,
    `## Smart Everyday Swaps`,
    ...plan.sustainableSwaps.map(
      (s) =>
        `- [${adopted.has(s.id) ? 'x' : ' '}] **${s.category}**: Instead of _${s.insteadOf}_ → **${s.switchTo}** (${s.co2SavedKgPerWeek} kg pollution cut/wk · ₹${s.monthlySavingsInr}/mo saved). ${s.directImpactExplanation}`
    ),
  ];
  return lines.join('\n');
}

export const HOUSEHOLD_LABELS: Record<HouseholdType, string> = {
  family_kids: 'Parents + Kids (2BHK / 3BHK Flat)',
  multigen_seniors: 'Joint Family + Elderly Parents',
  couple_solo: 'Working Couple / Solo Flat',
  shared_house: 'Shared Flat / Bachelors / PG',
};

export const HEATING_LABELS: Record<HeatingSource, string> = {
  gas_furnace: 'PNG / LPG Gas Stove + Chimney',
  wood_coal: 'Open Kitchen + Room Heaters',
  electric_heat_pump: 'Electric / Induction Kitchen',
  drafty_apartment: 'High-Rise Balcony Gaps / Road Facing',
};

export const COMMUTE_LABELS: Record<CommuteMode, string> = {
  gas_car: 'Solo Car / Auto / Cab Trips',
  public_transit: 'Metro / Society Shuttle / Carpool',
  bike_walk: 'Walk / Cycle Inside Society',
  remote_home: 'Work From Home',
};

export const DEFAULT_BASELINE_PLAN: GeneratedAirPlan = {
  location: 'Hyderabad',
  smogSeverity: 'sensitive',
  familyMode: 'all',
  generatedAt: 'Starter Flat Guide',
  isBaseline: true,
  locationSummary:
    'In calm mornings and evenings, traffic smoke and road dust settle low around apartment balconies until afternoon sunlight disperses the haze.',
  bestVentilationWindow:
    '3–5 PM (open opposite balcony doors briefly when afternoon sun lifts the haze; keep shut after evening traffic begins).',
  airAdvisory:
    'Keep balcony sliding doors shut in the morning and evening, switch on the kitchen chimney before cooking, and wet-mop floors instead of dry sweeping.',
  outdoorActivityAdvice:
    'Shift kids’ society park play and elderly walks to 3–5 PM; avoid brisk running near main roads before 10 AM.',
  commuteAdvice:
    'Join a 3-parent tower school carpool or use the society feeder shuttle to the metro; avoid idling the car in basement parking.',
  familyGuidance: {
    children:
      'Skip early 7 AM gate waits without a mask; keep bedroom DIY fan filter running on low from 8 PM onward.',
    adults:
      'Use N95 mask at metro/auto junctions, switch car climate to recirculate, and swap boiling chai water to electric kettle.',
    elderly:
      'Stay inside during foggy mornings before 11 AM; take gentle 15-minute sunny balcony or corridor walks around 3–5 PM.',
  },
  dailyRoutine: [
    {
      id: 'routine-morning',
      period: 'Morning',
      timeSlot: '7:30 AM',
      title: 'Society School Carpool & Chimney',
      action:
        'Share morning school drops without basement idling, and switch on the chimney before tea and tadka.',
      whyItHelps:
        'Keeps basement air, society gates, and closed living rooms cleaner in the morning.',
      co2SavedKgPerWeek: 5.2,
      pm25ReductionPct: 10,
    },
    {
      id: 'routine-afternoon',
      period: 'Afternoon',
      timeSlot: '3:00 PM',
      title: '10-Minute Cross-Breeze Check',
      action:
        'Open opposite balcony doors for 10 minutes during the 3–5 PM sun window, then wipe window sills.',
      whyItHelps:
        'Clears out stuffy indoor air at the cleanest hour without letting evening traffic smog inside.',
      co2SavedKgPerWeek: 4.5,
      pm25ReductionPct: 11,
    },
    {
      id: 'routine-night',
      period: 'Night',
      timeSlot: '9:30 PM',
      title: 'Bedroom Clean-Air Sleep Setup',
      action:
        'Close bedroom doors, tuck a rolled towel under the main door gap, and run a DIY fan-filter on low.',
      whyItHelps:
        'Gives children and elderly parents 8 hours of cleaner, calmer breathing all night while outdoor smog peaks.',
      co2SavedKgPerWeek: 2.4,
      pm25ReductionPct: 24,
    },
  ],
  indoorHacks: [
    {
      id: 'hack-diy-fan-filter',
      title: '₹1,500 DIY Fan + Filter Room Cleaner',
      roomFocus: 'Kids / Parents Bedroom',
      costTier: 'DIY Under ₹2,000',
      steps: [
        'Take a regular 16-inch table or box fan you already own at home.',
        'Tie or tape a replacement HEPA/AC fine-dust filter sheet snugly over the back air-intake side of the fan.',
        '₹600 filter sheet + a fan you already own = ₹1,500 total, vs ₹15,000 for a purifier.',
      ],
      impactMetric: 'Traps fine bedroom soot and winter dust overnight',
      explanation:
        '₹600 filter sheet + a fan you already own = ₹1,500 total, vs ₹15,000 for a purifier — pulling room air through dense pleats traps fine particles cheaply.',
      pm25ReductionPct: 25,
    },
    {
      id: 'hack-wet-mop',
      title: 'Wet Mop (Pocha) Instead of Dry Broom (Jhadu)',
      roomFocus: 'Living Room & Balcony',
      costTier: 'Free',
      steps: [
        'Ask house help or family to use a damp microfiber mop or wet cloth on floors instead of dry sweeping on smog days.',
        'Keep outdoor shoes and dusty school bags in one covered rack near the main door.',
      ],
      impactMetric: 'Keeps settled road dust from flying back into room air',
      explanation:
        'Dry brooms lift fine street dust that settled on tiles right back into the air where kids play and sit.',
      pm25ReductionPct: 15,
    },
    {
      id: 'hack-kitchen-hood',
      title: 'Pre-Tadka Chimney + Lid-Locked Simmering',
      roomFocus: 'Kitchen & Cooking Area',
      costTier: 'Free',
      steps: [
        'Turn the kitchen chimney onto speed 2 two minutes before heating oil or ghee for tadka.',
        'Keep a small exhaust window slightly cracked ONLY if wind blows outward; keep bedroom doors shut while cooking.',
      ],
      impactMetric: 'Pulls cooking oil steam and spice smoke straight outdoors',
      explanation:
        'Starting suction early builds an upward airflow column so spice smoke exits outdoors instead of drifting into the living room.',
      pm25ReductionPct: 18,
    },
    {
      id: 'hack-balcony-seal',
      title: 'Seal Sliding Balcony Door Gaps & Entrance Drafts',
      roomFocus: 'Hallway, Entrance & Bathroom Vents',
      costTier: 'Under ₹500',
      steps: [
        'Stick ₹150 self-adhesive foam tape along loose aluminum balcony sliding tracks and main door frames.',
        'Keep bathroom exhaust fans off when society diesel generators (DG) start up during power cuts.',
      ],
      impactMetric: 'Blocks outdoor traffic & DG smoke leaks',
      explanation:
        'High-rise balcony aluminum tracks and main doors often leave tiny gaps that pull smoky corridor or outdoor air straight inside.',
      pm25ReductionPct: 16,
    },
  ],
  sustainableSwaps: [
    {
      id: 'swap-society-carpool',
      category: 'Low-Emission Travel',
      insteadOf: '5 solo car/cab rides to metro or school',
      switchTo: 'Society carpool 3 days + e-rickshaw / shuttle',
      co2SavedKgPerWeek: 10.5,
      monthlySavingsInr: 1800,
      pm25ReductionPct: 12,
      directImpactExplanation:
        'Fewer cars leaving your society gate every morning means cleaner air right outside your tower and less petrol spent.',
    },
    {
      id: 'swap-kettle-chimney',
      category: 'Kitchen Energy Swap',
      insteadOf: 'Boiling water & slow simmering on open gas flames',
      switchTo: 'Electric kettle + covered cooker / induction plate',
      co2SavedKgPerWeek: 3.4,
      monthlySavingsInr: 450,
      pm25ReductionPct: 20,
      directImpactExplanation:
        'Open gas flames heat up the kitchen and release invisible fumes inside closed winter flats; electric kettles boil faster with zero fumes.',
    },
    {
      id: 'swap-incense-smoke',
      category: 'Household Fragrance Swap',
      insteadOf: 'Heavy agarbatti (incense) sticks & smoky dhoop indoors',
      switchTo: 'Fresh flowers, essential oil bowl, or tiny ghee diya near window',
      co2SavedKgPerWeek: 1.9,
      monthlySavingsInr: 300,
      pm25ReductionPct: 22,
      directImpactExplanation:
        'Burning incense inside a closed flat adds thick indoor smoke particles that stay trapped for hours on winter nights.',
    },
    {
      id: 'swap-society-compost',
      category: 'Society & Garden Care',
      insteadOf: 'Sweeping & burning dry garden leaves in empty plots',
      switchTo: 'Ask RWA to mulch dry leaves in society compost pits',
      co2SavedKgPerWeek: 4.2,
      monthlySavingsInr: 250,
      pm25ReductionPct: 14,
      directImpactExplanation:
        'One small pile of burning dry leaves near a society wall fills lower-floor flats with heavy toxic smoke.',
    },
  ],
};
