import { describe, expect, it } from 'vitest';
import { nextOccurrence } from '../src/utils/recurrence.js';

const local = (s) => new Date(s);

describe('nextOccurrence', () => {
  it('adds a day, a week or a month', () => {
    expect(nextOccurrence(local('2026-11-17T09:30:00'), 'daily')).toEqual(local('2026-11-18T09:30:00'));
    expect(nextOccurrence(local('2026-11-17T09:30:00'), 'weekly')).toEqual(local('2026-11-24T09:30:00'));
    expect(nextOccurrence(local('2026-11-17T09:30:00'), 'monthly')).toEqual(local('2026-12-17T09:30:00'));
  });

  it('rolls over months and years', () => {
    expect(nextOccurrence(local('2026-12-31T12:00:00'), 'daily')).toEqual(local('2027-01-01T12:00:00'));
    expect(nextOccurrence(local('2026-12-15T12:00:00'), 'monthly')).toEqual(local('2027-01-15T12:00:00'));
  });

  it('clamps monthly repeats to the end of shorter months', () => {
    expect(nextOccurrence(local('2026-01-31T12:00:00'), 'monthly')).toEqual(local('2026-02-28T12:00:00'));
    expect(nextOccurrence(local('2028-01-31T12:00:00'), 'monthly')).toEqual(local('2028-02-29T12:00:00'));
  });

  it('returns null for tasks that do not repeat', () => {
    expect(nextOccurrence(local('2026-11-17T12:00:00'), 'none')).toBeNull();
  });
});
