import { useCallback, useEffect, useState } from 'react';
import { tasksService } from '../services';

const CHECK_EVERY_MS = 60 * 1000;
const LATE_WINDOW_MS = 15 * 60 * 1000; // still remind if the app was opened up to 15 min late
const STORAGE_KEY = 'focushub_reminded';

const loadReminded = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

// Reminders that are due now: reminder time has passed, within the late window,
// task not finished and not shown before.
export const findDueReminders = (tasks, now, reminded) =>
  tasks.filter((task) => {
    if (task.status === 'done' || task.reminderMinutes == null || !task.dueDate) return false;
    const remindAt = new Date(task.dueDate).getTime() - task.reminderMinutes * 60 * 1000;
    return remindAt <= now && now - remindAt <= LATE_WINDOW_MS && !reminded.has(`${task._id}:${remindAt}`);
  });

export const describeReminder = (task) => {
  const due = new Date(task.dueDate);
  const when = task.allDay
    ? 'today'
    : `at ${due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return task.reminderMinutes === 0 ? `"${task.title}" is due now` : `"${task.title}" is due ${when}`;
};

// Checks once a minute for task reminders and shows a browser notification
// (when allowed) plus an in-app toast.
export function useTaskReminders() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((toast) => toast.id !== id)), []);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const now = Date.now();
      try {
        const start = new Date(now - 24 * 60 * 60 * 1000).toISOString();
        const end = new Date(now + 8 * 24 * 60 * 60 * 1000).toISOString();
        const { data } = await tasksService.getRange(start, end);
        if (cancelled) return;

        const reminded = loadReminded();
        for (const task of findDueReminders(data.tasks, now, reminded)) {
          const remindAt = new Date(task.dueDate).getTime() - task.reminderMinutes * 60 * 1000;
          reminded.add(`${task._id}:${remindAt}`);
          const message = describeReminder(task);
          setToasts((t) => [...t, { id: `${task._id}:${remindAt}`, message }]);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('FocusHub reminder', { body: message, tag: task._id });
          }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...reminded].slice(-200)));
      } catch {
        // offline or logged out: try again on the next tick
      }
    };

    check();
    const interval = setInterval(check, CHECK_EVERY_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { toasts, dismiss };
}
