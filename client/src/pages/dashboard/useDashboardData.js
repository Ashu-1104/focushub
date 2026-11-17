import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { dashboardService, tasksService } from '../../services';
import { addDays, dateKey, startOfDay } from '../../utils/calendar';
import { TASKS_CHANGED_EVENT } from '../../hooks/useRealtimeSync';

const REFRESH_MS = 60 * 1000;

// Everything the dashboard designs show, from the existing APIs.
// Everything the dashboard shows, from the existing APIs. Refreshes when tasks change in another
// tab or device (real-time sync), every minute, and on demand after the dashboard's own edits.
export function useDashboardData() {
  const user = useSelector((state) => state.auth.user);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const today = startOfDay(new Date());
    const weekEnd = addDays(today, 7);
    try {
      const [summary, pinned, activity, week, all] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getPinned(),
        dashboardService.getActivity(6),
        tasksService.getRange(today.toISOString(), weekEnd.toISOString()),
        tasksService.getAll(1, 100),
      ]);
      const weekTasks = week.data.tasks;
      const days = Array.from({ length: 7 }, (_, i) => {
        const day = addDays(today, i);
        return { day, tasks: weekTasks.filter((t) => dateKey(t.dueDate) === dateKey(day)) };
      });
      const open = all.data.tasks.filter((t) => t.status !== 'done');
      setData({
        ...summary.data,
        upNext: pinned.data.tasks,
        activities: activity.data.activities,
        week: days,
        overdue: open.filter((t) => t.dueDate && new Date(t.dueDate) < today).length,
      });
      setError('');
    } catch {
      setError('Could not load your dashboard. Check your connection and try again.');
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    window.addEventListener(TASKS_CHANGED_EVENT, load);
    return () => {
      clearInterval(interval);
      window.removeEventListener(TASKS_CHANGED_EVENT, load);
    };
  }, [load]);

  return { data, error, user, reload: load };
}

export const greeting = (date = new Date()) => {
  const h = date.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export const PRIORITY_COLORS = {
  urgent: '#f87171',
  high: '#fb923c',
  medium: '#60a5fa',
  low: '#94a3b8',
};

export const activityText = (a) => {
  const what = a.targetModel === 'Task' ? 'task' : a.targetModel === 'Note' ? 'note' : 'item';
  const title = a.metadata?.title ? `“${a.metadata.title}”` : `a ${what}`;
  return `${a.type.charAt(0).toUpperCase()}${a.type.slice(1)} ${what} ${title}`;
};

export const activityKind = (a) =>
  ({ created: 'created', completed: 'completed', deleted: 'deleted' })[a.type] || 'updated';

export const timeAgo = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
};
