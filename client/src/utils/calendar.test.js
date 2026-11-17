import { describe, expect, it } from 'vitest';
import {
  dateKey,
  dueDateFromKey,
  formatRangeTitle,
  getVisibleDays,
  groupTasksByDay,
  shiftAnchor,
} from './calendar';

describe('calendar helpers', () => {
  it('shows six Monday-first weeks for a month', () => {
    const days = getVisibleDays(new Date(2026, 10, 17), 'month');
    expect(days).toHaveLength(42);
    expect(dateKey(days[0])).toBe('2026-10-26'); // Monday before Nov 1
    expect(days.every((d, i) => i === 0 || d > days[i - 1])).toBe(true);
  });

  it('shows Monday to Sunday for a week', () => {
    const days = getVisibleDays(new Date(2026, 10, 19), 'week');
    expect(days.map(dateKey)).toEqual([
      '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22',
    ]);
  });

  it('stores all-day dates at local noon and keeps picked times', () => {
    expect(dateKey(dueDateFromKey('2026-11-30'))).toBe('2026-11-30');
    expect(new Date(dueDateFromKey('2026-11-30')).getHours()).toBe(12);
    expect(new Date(dueDateFromKey('2026-11-30', '09:45')).getMinutes()).toBe(45);
  });

  it('moves the anchor by a month or a week', () => {
    expect(dateKey(shiftAnchor(new Date(2026, 0, 31), 'month', 1))).toBe('2026-02-01');
    expect(dateKey(shiftAnchor(new Date(2026, 10, 17), 'week', -1))).toBe('2026-11-10');
  });

  it('groups tasks by due day and skips tasks without a date', () => {
    const groups = groupTasksByDay([
      { _id: 'a', dueDate: dueDateFromKey('2026-11-17') },
      { _id: 'b', dueDate: dueDateFromKey('2026-11-17', '18:00') },
      { _id: 'c', dueDate: null },
    ]);
    expect(Object.keys(groups)).toEqual(['2026-11-17']);
    expect(groups['2026-11-17'].map((t) => t._id)).toEqual(['a', 'b']);
  });

  it('titles the visible range', () => {
    expect(formatRangeTitle(new Date(2026, 10, 17), 'month')).toMatch(/November 2026/);
    expect(formatRangeTitle(new Date(2026, 10, 17), 'week')).toMatch(/2026/);
  });
});
