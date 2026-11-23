import type { AirPlannerInput } from '../types/air';

export interface PlaybookItem {
  id: string;
  agencyLabel: string;
  category: string;
  title: string;
  stat: string;
  bg: string;
  img: string;
  imgAlt: string;
  desc: string;
  impactDetail: string;
  presetInput: AirPlannerInput;
}

export const COMMUNITY_PLAYBOOKS: PlaybookItem[] = [
  {
    id: 'society-carpool',
    agencyLabel: 'Gated Society Travel',
    category: 'Shared School & Metro Runs',
    title: 'Tower School Carpool Pact',
    stat: '-14 kg pollution / wk',
    bg: '#FFE14D',
    img: '/src/assets/images/indian_society_carpool_1795463059152.jpg',
    imgAlt: 'Indian parents and school-age children in uniforms carpooling beside a compact hatchback inside a gated apartment society driveway',
    desc: 'Parents across two apartment towers teamed up via a simple WhatsApp sheet to share school drops and short metro rides—cutting 20 morning gate trips a week.',
    impactDetail:
      'Cold cars starting up in apartment basements release thick exhaust right where kids walk to school buses. Sharing just two rides a week clears up the society gate.',
    presetInput: {
      location: 'Gurugram Sector 56, Haryana',
      smogSeverity: 'severe',
      household: 'family_kids',
      heating: 'gas_furnace',
      commute: 'gas_car',
      notes: '10th floor flat, morning school run, want easy carpool & balcony tips',
    },
  },
  {
    id: 'diy-fan-filter',
    agencyLabel: 'Budget Bedroom Hack',
    category: 'Low-Cost Room Cleaner',
    title: '₹1,500 DIY Fan Filter Drive',
    stat: '-25% Room Dust',
    bg: '#FF66B3',
    img: '/src/assets/images/indian_fan_filter_1795463059784.jpg',
    imgAlt: 'Indian apartment bedroom with a table pedestal fan fitted with a HEPA filter sheet next to a block-print wooden diwan and balcony doors',
    desc: 'Residents ordered bulk HEPA filter sheets and taped them to regular home table fans—making affordable room cleaners in 10 minutes.',
    impactDetail:
      '₹600 filter sheet + a fan you already own = ₹1,500 total, vs ₹15,000 for a purifier.',
    presetInput: {
      location: 'Noida Extension, UP',
      smogSeverity: 'hazardous',
      household: 'multigen_seniors',
      heating: 'drafty_apartment',
      commute: 'public_transit',
      notes: 'Elderly parents room, loose balcony sliding doors, looking for budget DIY air cleaner',
    },
  },
  {
    id: 'clean-tadka-kitchen',
    agencyLabel: 'Smokeless Kitchen',
    category: 'Everyday Cooking Swaps',
    title: 'Chimney-First Tadka Routine',
    stat: '-70% Kitchen Fumes',
    bg: '#70D6FF',
    img: '/src/assets/images/indian_chimney_kitchen_1795463060201.jpg',
    imgAlt: 'Indian woman cooking dal in a pressure cooker and tempering tadka under an exhaust chimney in a modern Indian apartment kitchen',
    desc: 'Apartment homes switched boiling chai water to electric kettles, kept lids on dals, and ran the chimney 2 minutes before tadka so spice smoke never filled bedrooms.',
    impactDetail:
      'When winter smog keeps balcony doors closed all day, cooking fumes linger inside the flat for hours unless vented early.',
    presetInput: {
      location: 'Whitefield, Bengaluru',
      smogSeverity: 'sensitive',
      household: 'family_kids',
      heating: 'electric_heat_pump',
      commute: 'remote_home',
      notes: 'Open kitchen connected to living room, toddler sensitive to cooking smoke',
    },
  },
  {
    id: 'no-burn-society',
    agencyLabel: 'RWA & Society Pact',
    category: 'Cleaner Society Air',
    title: 'Zero Leaf-Burn & DG Alert',
    stat: '-9 kg smoke / wk',
    bg: '#C8F542',
    img: '/src/assets/images/indian_society_park_1795463060451.jpg',
    imgAlt: 'Indian residents checking air quality on a smartphone while walking along a gated apartment society garden track near compost bins',
    desc: 'Residents asked their RWA to compost dry garden leaves instead of burning them in corners, and shared quick alerts when diesel backup generators (DG) started.',
    impactDetail:
      'One pile of smoldering leaves near a boundary wall sends heavy smoke straight up into 1st to 6th floor balconies.',
    presetInput: {
      location: 'Indirapuram, Ghaziabad',
      smogSeverity: 'hazardous',
      household: 'multigen_seniors',
      heating: 'drafty_apartment',
      commute: 'public_transit',
      notes: 'Lower floor flat near society park and DG backup room',
    },
  },
];

export interface CleanAirEngine {
  id: string;
  title: string;
  bg: string;
  desc: string;
  items: string[];
  focusHint: string;
}

export const CLEAN_AIR_ENGINES: CleanAirEngine[] = [
  {
    id: 'engine-filtration',
    title: 'Seal & Clean Bedroom Air',
    bg: '#FFE14D',
    desc: 'Easy ways to stop outside dust from creeping through balcony sliding gaps and keep bedrooms fresh for kids and parents.',
    items: [
      '₹1,500 DIY Fan + Filter Box',
      'Foam Tape on Balcony Sliders',
      'Rolled Towel Under Main Door',
      'Wet Mop (Pocha), No Dry Broom',
    ],
    focusHint: 'Sealing high-rise balcony gaps and budget bedroom air filter',
  },
  {
    id: 'engine-commute',
    title: 'Society Travel & Gate Hacks',
    bg: '#FF66B3',
    desc: 'Cut basement fumes and save petrol with simple tower carpools, shuttle timing, and combining weekly market runs.',
    items: [
      'No Idling in Basement Parking',
      'Tower School Carpool Sheet',
      'Metro + E-Rickshaw Last Mile',
      'Combine Grocery & Errand Trips',
    ],
    focusHint: 'Society carpooling and cutting solo car/cab rides',
  },
  {
    id: 'engine-cooking',
    title: 'Smokeless Indian Kitchens',
    bg: '#C8F542',
    desc: 'Stop tadka smoke, gas heat, and heavy incense from getting trapped inside closed winter flats.',
    items: [
      'Chimney On 2 Mins Before Tadka',
      'Electric Kettle for Morning Chai',
      'Pressure Cook with Lids On',
      'Skip Heavy Agarbatti Smoke',
    ],
    focusHint: 'Keeping tadka smoke and gas fumes out of living rooms',
  },
  {
    id: 'engine-society',
    title: 'Smart Flat & RWA Habits',
    bg: '#70D6FF',
    desc: 'Simple power-saving and society tips that lower diesel generator use and stop nearby garbage or leaf burning.',
    items: [
      'Warm Flat with Sunny Curtains',
      'Close Exhausts During DG Backup',
      'Dry Laundry Rack Indoors',
      'Compost Dry Leaves in Society',
    ],
    focusHint: 'Reducing heater power load and blocking DG backup smoke',
  },
];

export interface HabitPill {
  label: string;
  bg: string;
  rot: number;
  dark?: boolean;
}

export const COMMUNITY_HABITS: HabitPill[] = [
  { label: 'DIY Fan Filter', bg: '#FFFFFF', rot: -3 },
  { label: 'Chimney Before Tadka', bg: '#FF66B3', rot: 2 },
  { label: 'Wet Mop No Broom', bg: '#C8F542', rot: -2 },
  { label: '3 PM Window Check', bg: '#70D6FF', rot: 4 },
  { label: 'Tower Carpool', bg: '#B892FF', rot: -4 },
  { label: 'Towel Under Main Door', bg: '#FF6B35', rot: 2, dark: true },
  { label: 'Skip Agarbatti Smoke', bg: '#FFFFFF', rot: -2 },
  { label: 'Electric Kettle Chai', bg: '#3B66FF', rot: 3, dark: true },
];

export const CITY_PRESETS: Array<{ label: string; input: AirPlannerInput }> = [
  {
    label: 'Gurugram / Delhi NCR',
    input: {
      location: 'Gurugram / Delhi NCR',
      smogSeverity: 'severe',
      household: 'family_kids',
      heating: 'gas_furnace',
      commute: 'gas_car',
      notes: '12th floor society flat, morning school run, kids play in living room',
    },
  },
  {
    label: 'Noida High-Rise',
    input: {
      location: 'Noida Sector 75, UP',
      smogSeverity: 'hazardous',
      household: 'multigen_seniors',
      heating: 'drafty_apartment',
      commute: 'public_transit',
      notes: 'Elderly parents with cough, loose balcony sliding doors, winter fog',
    },
  },
  {
    label: 'Mumbai Suburbs',
    input: {
      location: 'Powai / Andheri, Mumbai',
      smogSeverity: 'sensitive',
      household: 'family_kids',
      heating: 'gas_furnace',
      commute: 'public_transit',
      notes: 'Construction dust nearby, open kitchen, afternoon sea breeze',
    },
  },
  {
    label: 'Bengaluru Society',
    input: {
      location: 'Whitefield, Bengaluru',
      smogSeverity: 'moderate',
      household: 'couple_solo',
      heating: 'electric_heat_pump',
      commute: 'remote_home',
      notes: 'Traffic corridor dust, working from home, balcony garden',
    },
  },
];

export interface CommunityStory {
  quote: string;
  name: string;
  role: string;
  location: string;
  outcome: string;
  accent: string;
  img: string;
}

export const COMMUNITY_STORIES: CommunityStory[] = [
  {
    quote:
      '“We didn’t buy ₹15,000 purifiers for every room. A ₹600 filter sheet + a fan you already own = ₹1,500 total, and wet-mopping instead of dry jhadu made our parents’ bedroom noticeably fresher the very first night.”',
    name: 'Ananya Sharma',
    role: 'Apartment Resident & Mom of Two',
    location: 'Gurugram Sector 54',
    outcome: '-25% bedroom dust & smoke',
    accent: '#FF66B3',
    img: '/src/assets/images/indian_portrait_ananya_1795463061318.jpg',
  },
];
