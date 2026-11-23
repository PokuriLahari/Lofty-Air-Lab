import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDiurnalPollutionTrend,
  buildWeeklyPollutionTrend,
  classifyLocalAqiBand,
  formatAlertBannerCopy,
  getFamilyModeAdvisory,
  getVentilationStatus,
  normalizeGoogleAirQualityResponse,
  shouldTriggerSmogAlert,
  validateAlertSubscriptionInput,
} from './alertLogic';

test('normalizeGoogleAirQualityResponse prefers local national AQI over inverted UAQI and extracts PM2.5/PM10', () => {
  const reading = normalizeGoogleAirQualityResponse(
    {
      indexes: [
        { code: 'uaqi', displayName: 'Universal AQI', aqi: 30, category: 'Poor air quality' },
        {
          code: 'ind_cpcb',
          displayName: 'NAQI (India)',
          aqi: 268,
          category: 'Poor air quality',
          dominantPollutant: 'pm25',
        },
      ],
      pollutants: [
        { code: 'pm25', concentration: { value: 142.4, units: 'MICROGRAMS_PER_CUBIC_METER' } },
        { code: 'pm10', concentration: { value: 235.1, units: 'MICROGRAMS_PER_CUBIC_METER' } },
      ],
      healthRecommendations: {
        generalPopulation: 'Limit prolonged outdoor exertion.',
      },
    },
    '8:00 AM'
  );

  assert.equal(reading.aqi, 268);
  assert.equal(reading.pm25, 142);
  assert.equal(reading.pm10, 235);
  assert.equal(reading.scaleLabel, 'NAQI (India)');
  assert.equal(reading.severity, 'hazardous');
  assert.equal(reading.dominantPollutant, 'PM25');
  assert.equal(reading.checkedAt, '8:00 AM');
  assert.equal(reading.hourlyTrend?.length, 10);
  assert.equal(reading.weeklyTrend?.length, 7);
});

test('normalizeGoogleAirQualityResponse converts inverted UAQI when no local scale exists', () => {
  const cleanReading = normalizeGoogleAirQualityResponse(
    {
      indexes: [{ code: 'uaqi', displayName: 'Universal AQI', aqi: 89, category: 'Excellent air quality' }],
    },
    '2:00 PM'
  );
  assert.ok(cleanReading.aqi < 100);
  assert.equal(cleanReading.severity, 'moderate');
  assert.ok((cleanReading.pm25 ?? 0) > 0 && (cleanReading.pm10 ?? 0) > (cleanReading.pm25 ?? 0));
});

test('buildDiurnalPollutionTrend identifies afternoon safe window lower than morning peak', () => {
  const trend = buildDiurnalPollutionTrend(220, 105);
  assert.equal(trend.length, 10);
  const morning = trend.find((p) => p.hour === '8 AM');
  const afternoon = trend.find((p) => p.hour === '2 PM');
  assert.ok(morning && afternoon);
  assert.ok(afternoon.aqi < morning.aqi);
  assert.equal(afternoon.safeWindow, true);

  const weekly = buildWeeklyPollutionTrend(220, 105);
  assert.equal(weekly.length, 7);
  assert.equal(weekly[6].day, 'Today');
  assert.equal(weekly[6].aqi, 220);
});

test('getFamilyModeAdvisory and getVentilationStatus tailor guidance by age group and AQI', () => {
  const kidsExtreme = getFamilyModeAdvisory(260, 'children');
  const elderlyExtreme = getFamilyModeAdvisory(260, 'elderly');
  const adultsSevere = getFamilyModeAdvisory(185, 'adults');

  assert.match(kidsExtreme.headline, /indoors|school/i);
  assert.match(elderlyExtreme.headline, /6 AM|walks/i);
  assert.match(adultsSevere.headline, /N95|traffic/i);

  assert.equal(getVentilationStatus(265, '3–5 PM').statusLabel, 'Keep Doors Sealed');
  assert.equal(getVentilationStatus(265, '3–5 PM').bestHours, '3–5 PM');
  assert.equal(getVentilationStatus(185, '3–5 PM').statusLabel, 'Open Midday Only');
  assert.equal(getVentilationStatus(75, '3–5 PM').statusLabel, 'Safe to Ventilate');
});

test('shouldTriggerSmogAlert respects enabled flag and threshold boundary', () => {
  assert.equal(shouldTriggerSmogAlert({ aqi: 151 }, 151, true), true);
  assert.equal(shouldTriggerSmogAlert({ aqi: 150 }, 151, true), false);
  assert.equal(shouldTriggerSmogAlert({ aqi: 310 }, 151, false), false);
  assert.equal(shouldTriggerSmogAlert(null, 101, true), false);
});

test('classifyLocalAqiBand and formatAlertBannerCopy return plain-English apartment guidance', () => {
  assert.equal(classifyLocalAqiBand(280).severity, 'hazardous');
  assert.equal(classifyLocalAqiBand(103).shortLabel, 'Poor');
  const copy = formatAlertBannerCopy(
    { locationLabel: 'Hyderabad', thresholdAqi: 151 },
    { aqi: 175, category: 'Unhealthy', healthTip: 'Keep balcony doors sealed.' }
  );
  assert.match(copy.title, /Hyderabad/);
  assert.match(copy.title, /175/);
  assert.match(copy.body, /151\+/);
});

test('validateAlertSubscriptionInput rejects invalid coordinates and short locations', () => {
  assert.equal(validateAlertSubscriptionInput({ locationLabel: 'A', lat: 28.4, lng: 77.0 }).valid, false);
  assert.equal(validateAlertSubscriptionInput({ locationLabel: 'Noida 62', lat: 999, lng: 77.0 }).valid, false);

  const ok = validateAlertSubscriptionInput({
    locationLabel: 'Powai, Mumbai',
    lat: 19.1176,
    lng: 72.906,
    thresholdAqi: 101,
    channel: 'browser_push',
  });
  assert.equal(ok.valid, true);
  assert.equal(ok.sanitized?.thresholdAqi, 101);
  assert.equal(ok.sanitized?.channel, 'browser_push');
});
