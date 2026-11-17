import { describe, expect, it } from 'vitest';
import { findDueReminders } from './useTaskReminders';

const NOW = new Date('2026-11-17T10:00:00Z').getTime();
const task = (overrides) => ({
  _id: 't1',
  title: 'Call the dentist',
  status: 'todo',
  dueDate: '2026-11-17T10:30:00Z',
  reminderMinutes: 30,
  ...overrides,
});

describe('findDueReminders', () => {
  it('returns tasks whose reminder time has just passed', () => {
    expect(findDueReminders([task()], NOW, new Set())).toHaveLength(1);
  });

  it('waits until the reminder time', () => {
    expect(findDueReminders([task({ reminderMinutes: 10 })], NOW, new Set())).toHaveLength(0);
  });

  it('skips stale, finished, reminder-less or already shown tasks', () => {
    const remindAt = new Date('2026-11-17T10:00:00Z').getTime();
    expect(findDueReminders([task({ dueDate: '2026-11-17T09:00:00Z', reminderMinutes: 0 })], NOW, new Set())).toHaveLength(0);
    expect(findDueReminders([task({ status: 'done' })], NOW, new Set())).toHaveLength(0);
    expect(findDueReminders([task({ reminderMinutes: null })], NOW, new Set())).toHaveLength(0);
    expect(findDueReminders([task()], NOW, new Set([`t1:${remindAt}`]))).toHaveLength(0);
  });
});
