import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAdoptedImpact,
  classifyHackRoomCategory,
  DEFAULT_BASELINE_PLAN,
  formatPlanMarkdown,
  getAqiTierMeta,
  mergeHabitIntoNotes,
  validatePlannerInput,
} from './airImpact';

test('validatePlannerInput rejects empty or 1-char locations', () => {
  const emptyResult = validatePlannerInput({ location: '   ' });
  assert.equal(emptyResult.valid, false);
  assert.ok(emptyResult.error?.includes('city, sector, or society'));

  const shortResult = validatePlannerInput({ location: 'A' });
  assert.equal(shortResult.valid, false);
});

test('validatePlannerInput sanitizes valid inputs and normalizes unknown enums safely', () => {
  const result = validatePlannerInput({
    location: '  Gurugram Sector 56  ',
    smogSeverity: 'hazardous',
    familyMode: 'elderly',
    household: 'family_kids',
    heating: 'gas_furnace',
    commute: 'public_transit',
    notes: '  14th floor facing road  ',
  });
  assert.equal(result.valid, true);
  assert.equal(result.sanitized?.location, 'Gurugram Sector 56');
  assert.equal(result.sanitized?.smogSeverity, 'hazardous');
  assert.equal(result.sanitized?.familyMode, 'elderly');
  assert.equal(result.sanitized?.notes, '14th floor facing road');

  const fallbackMode = validatePlannerInput({
    location: 'Noida 75',
    familyMode: 'invalid' as unknown as 'all',
  });
  assert.equal(fallbackMode.sanitized?.familyMode, 'all');
});

test('classifyHackRoomCategory maps apartment room focus strings reliably', () => {
  assert.equal(classifyHackRoomCategory('Kids / Parents Bedroom'), 'bedroom');
  assert.equal(classifyHackRoomCategory('Living Room & Balcony'), 'living');
  assert.equal(classifyHackRoomCategory('Kitchen & Cooking Area'), 'kitchen');
  assert.equal(classifyHackRoomCategory('Main Entrance & Hallway'), 'hallway');
});

test('calculateAdoptedImpact computes weekly pollution cut, indoor dust cap, INR savings, and clarity score', () => {
  const emptyImpact = calculateAdoptedImpact(DEFAULT_BASELINE_PLAN, []);
  assert.equal(emptyImpact.adoptedCount, 0);
  assert.equal(emptyImpact.weeklyCo2SavedKg, 0);
  assert.equal(emptyImpact.indoorPm25CutPct, 0);
  assert.equal(emptyImpact.monthlySavingsInr, 0);
  assert.equal(emptyImpact.skyClarityScore, 0.15);

  assert.deepEqual(
    DEFAULT_BASELINE_PLAN.dailyRoutine.map((r) => r.period),
    ['Morning', 'Afternoon', 'Night']
  );

  const selectedIds = ['routine-morning', 'hack-diy-fan-filter', 'swap-society-carpool'];
  const partialImpact = calculateAdoptedImpact(DEFAULT_BASELINE_PLAN, selectedIds);
  assert.equal(partialImpact.adoptedCount, 3);
  assert.equal(partialImpact.weeklyCo2SavedKg, 15.7);
  assert.equal(partialImpact.monthlySavingsInr, 1800);
  assert.ok(partialImpact.indoorPm25CutPct > 20 && partialImpact.indoorPm25CutPct <= 78);

  const allIds = [
    ...DEFAULT_BASELINE_PLAN.dailyRoutine.map((r) => r.id),
    ...DEFAULT_BASELINE_PLAN.indoorHacks.map((h) => h.id),
    ...DEFAULT_BASELINE_PLAN.sustainableSwaps.map((s) => s.id),
  ];
  const fullImpact = calculateAdoptedImpact(DEFAULT_BASELINE_PLAN, allIds);
  assert.equal(fullImpact.adoptionPct, 100);
  assert.equal(fullImpact.indoorPm25CutPct, 78);
  assert.equal(fullImpact.skyClarityScore, 1);
});

test('mergeHabitIntoNotes appends unique habits without duplicating', () => {
  const first = mergeHabitIntoNotes('', 'DIY Fan Filter');
  assert.equal(first, 'Priority focus: DIY Fan Filter');

  const second = mergeHabitIntoNotes(first, 'Wet Mop No Broom');
  assert.equal(second, 'Priority focus: DIY Fan Filter; Wet Mop No Broom');

  const duplicate = mergeHabitIntoNotes(second, 'diy fan filter');
  assert.equal(duplicate, second);
});

test('getAqiTierMeta returns unified-scale labels and range metadata', () => {
  const severe = getAqiTierMeta('severe');
  assert.equal(severe.aqiRange, 'AQI 151–200');
  assert.equal(severe.label, 'Unhealthy');

  const poor = getAqiTierMeta('sensitive');
  assert.equal(poor.aqiRange, 'AQI 101–150');
  assert.equal(poor.label, 'Poor');
});

test('formatPlanMarkdown exports structured checklist with INR savings', () => {
  const md = formatPlanMarkdown(DEFAULT_BASELINE_PLAN, ['routine-morning', 'swap-society-carpool']);
  assert.ok(md.includes('Hyderabad'));
  assert.ok(md.includes('[x] **7:30 AM'));
  assert.ok(md.includes('[ ] **3:00 PM'));
  assert.ok(md.includes('₹1800/month saved'));
});
