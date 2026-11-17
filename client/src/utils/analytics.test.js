import { describe, expect, it } from 'vitest';
import { formatAxisMinutes, formatHour, formatMinutes, heatLevel, heatmapWeeks, insights } from './analytics';

describe('analytics helpers', () => {
  it('formats minutes and hours', () => {
    expect(formatMinutes(0)).toBe('0m');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(120)).toBe('2h');
    expect(formatMinutes(135)).toBe('2h 15m');
    expect(formatAxisMinutes(45)).toBe('45m');
    expect(formatAxisMinutes(135)).toBe('2.3h');
    expect(formatHour(0)).toBe('12 AM');
    expect(formatHour(9)).toBe('9 AM');
    expect(formatHour(15)).toBe('3 PM');
  });

  it('grades heatmap cells against the busiest day', () => {
    expect(heatLevel(0, 8)).toBe(0);
    expect(heatLevel(1, 8)).toBe(1);
    expect(heatLevel(8, 8)).toBe(4);
  });

  it('lays the heatmap out in Monday-first weeks', () => {
    // 2026-11-18 is a Wednesday: two blanks before it
    const cells = ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'].map((date) => ({ date, count: 1 }));
    const weeks = heatmapWeeks(cells);
    expect(weeks[0].slice(0, 2)).toEqual([null, null]);
    expect(weeks[0][2].date).toBe('2026-11-18');
    expect(weeks[1][0].date).toBe('2026-11-23');
  });

  it('writes insights only from real data', () => {
    const base = {
      range: { days: 7 },
      totals: { completed: 0, onTimeRate: null },
      change: { completed: null },
      byWeekday: [{ day: 'Mon', completed: 0 }],
      byHour: [{ hour: 9, focusMinutes: 0 }],
    };
    expect(insights(base)).toEqual([]);
    const busy = {
      ...base,
      totals: { completed: 6, onTimeRate: 50 },
      change: { completed: 20 },
      byWeekday: [{ day: 'Mon', completed: 1 }, { day: 'Wed', completed: 4 }],
      byHour: [{ hour: 9, focusMinutes: 90 }, { hour: 14, focusMinutes: 30 }],
    };
    expect(insights(busy)).toEqual([
      'Wed is your most productive day: 4 tasks done.',
      'You focus best around 9 AM (1h 30m in the last 7 days).',
      'You completed 20% more tasks than the previous 7 days.',
      'Only 50% of tasks with a due date were finished on time; try fewer tasks per day.',
    ]);
  });
});
