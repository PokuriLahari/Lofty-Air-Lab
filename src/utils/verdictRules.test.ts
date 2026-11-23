import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWeeklyPm25TrendFromOpenMeteo,
  calculateWeeklyPm25Change,
  classifyOpenMeteoAqiBadge,
  computeSafetyVerdict,
  findCleanestTwoHourWindow,
  formatShortCityName,
  isCoordinateLabel,
} from './verdictRules.ts';

describe('verdictRules deterministic logic', () => {
  it('returns Good to go when PM2.5 < 30 across user profiles', () => {
    const adultWalk = computeSafetyVerdict({ pm25: 22, aqi: 42, person: 'adult', activity: 'walk' });
    const asthmaRun = computeSafetyVerdict({ pm25: 25, aqi: 46, person: 'asthma', activity: 'run' });
    assert.equal(adultWalk.verdict, 'Good to go');
    assert.equal(asthmaRun.verdict, 'Good to go');
    assert.equal(classifyOpenMeteoAqiBadge(22, 42).category, 'Good');
  });

  it('applies stricter thresholds for child, elderly, and asthma above PM2.5 60 and 100', () => {
    const childRunAt75 = computeSafetyVerdict({ pm25: 75, aqi: 160, person: 'child', activity: 'run' });
    assert.equal(childRunAt75.verdict, 'Stay in');
    assert.ok(childRunAt75.vulnerableReason && childRunAt75.vulnerableReason.includes('children'));

    const asthmaWalkAt115 = computeSafetyVerdict({ pm25: 115, aqi: 185, person: 'asthma', activity: 'walk' });
    assert.equal(asthmaWalkAt115.verdict, 'Stay in');
    assert.ok(asthmaWalkAt115.vulnerableReason && asthmaWalkAt115.vulnerableReason.includes('asthma'));

    const adultErrandsAt115 = computeSafetyVerdict({ pm25: 115, aqi: 185, person: 'adult', activity: 'errands' });
    assert.equal(adultErrandsAt115.verdict, 'Go easy');
  });

  it('forces Stay in for everyone when PM2.5 > 150', () => {
    const adultWalkAt175 = computeSafetyVerdict({ pm25: 175, aqi: 260, person: 'adult', activity: 'walk' });
    const elderlyWalkAt175 = computeSafetyVerdict({ pm25: 175, aqi: 260, person: 'elderly', activity: 'walk' });
    assert.equal(adultWalkAt175.verdict, 'Stay in');
    assert.equal(elderlyWalkAt175.verdict, 'Stay in');
    assert.equal(classifyOpenMeteoAqiBadge(175, 260).category, 'Severe');
  });

  it('handles missing station readings honestly without inventing a verdict', () => {
    const unavailable = computeSafetyVerdict({
      pm25: null,
      aqi: null,
      person: 'elderly',
      activity: 'walk',
      stationUnavailable: true,
    });
    assert.equal(unavailable.status, 'unavailable');
    assert.match(unavailable.headline, /unavailable/i);
  });

  it('selects the cleanest contiguous 2-hour daylight window from hourly PM2.5 forecast', () => {
    const times = [
      '2026-11-23T06:00',
      '2026-11-23T07:00',
      '2026-11-23T08:00',
      '2026-11-23T13:00',
      '2026-11-23T14:00',
      '2026-11-23T15:00',
      '2026-11-23T22:00',
    ];
    const pm = [95, 110, 102, 42, 34, 38, 120];
    const best = findCleanestTwoHourWindow(times, pm);
    assert.equal(best.startHour, '2 PM');
    assert.equal(best.endHour, '4 PM');
    assert.equal(best.windowLabel, '2–4 PM');
    assert.equal(best.avgPm25, 36);
  });

  it('never leaks raw coordinates as a city label and resolves unified 5-step AQI scale', () => {
    assert.equal(isCoordinateLabel('17.51, 78.41'), true);
    assert.equal(formatShortCityName('17.51, 78.41', { lat: 17.51, lng: 78.41 }), 'Hyderabad');
    assert.equal(formatShortCityName('Hyderabad, Telangana'), 'Hyderabad');

    assert.equal(classifyOpenMeteoAqiBadge(20, 45).category, 'Good');
    assert.equal(classifyOpenMeteoAqiBadge(30, 88).category, 'Moderate');
    assert.equal(classifyOpenMeteoAqiBadge(37, 103).category, 'Poor');
    assert.equal(classifyOpenMeteoAqiBadge(75, 165).category, 'Unhealthy');
    assert.equal(classifyOpenMeteoAqiBadge(140, 225).category, 'Severe');
  });

  it('aggregates 7-day Open-Meteo hourly arrays and computes improvement trend', () => {
    const times = [
      '2026-11-17T10:00',
      '2026-11-17T14:00',
      '2026-11-18T10:00',
      '2026-11-19T10:00',
      '2026-11-20T10:00',
      '2026-11-21T10:00',
      '2026-11-22T10:00',
      '2026-11-23T10:00',
    ];
    const pm = [90, 70, 76, 68, 62, 58, 52, 48];
    const aqi = [165, 145, 155, 142, 130, 122, 110, 102];

    const series = buildWeeklyPm25TrendFromOpenMeteo(times, pm, aqi);
    assert.equal(series.length, 7);
    assert.equal(series[0].pm25, 80); // avg of 90 and 70
    assert.equal(series[series.length - 1].day, 'Today');
    assert.equal(series[series.length - 1].pm25, 48);

    const trend = calculateWeeklyPm25Change(series);
    assert.equal(trend.direction, 'improved');
    assert.equal(trend.pctChange, -40);
  });
});
