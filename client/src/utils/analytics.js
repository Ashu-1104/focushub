// Formatting and plain-language insights for the analytics page.

export const formatMinutes = (minutes) => {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
};

// compact axis label: 45m, 1.5h, 10h
export const formatAxisMinutes = (minutes) =>
  minutes >= 60 ? `${Math.round((minutes / 60) * 10) / 10}h` : `${minutes}m`;

export const formatHour = (hour) => {
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 || 12} ${suffix}`;
};

export const formatDay = (iso, opts = { day: 'numeric', month: 'short' }) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, opts);

// 0-4 intensity for the activity heatmap, relative to the busiest day
export const heatLevel = (count, max) => {
  if (!count || !max) return 0;
  return Math.min(4, Math.ceil((count / max) * 4));
};

// Heatmap as weeks (columns) of 7 days, Monday first; leading blanks pad the first week.
export const heatmapWeeks = (cells) => {
  if (!cells.length) return [];
  const firstWeekday = (new Date(`${cells[0].date}T12:00:00Z`).getUTCDay() + 6) % 7;
  const padded = [...Array(firstWeekday).fill(null), ...cells];
  const weeks = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
  return weeks;
};

// A few short, specific observations; empty when there is not enough data yet.
export const insights = (data) => {
  const notes = [];
  const { totals, change, byWeekday, byHour, range } = data;
  const busiest = [...byWeekday].sort((a, b) => b.completed - a.completed)[0];
  if (busiest?.completed) notes.push(`${busiest.day} is your most productive day: ${busiest.completed} task${busiest.completed === 1 ? '' : 's'} done.`);
  const peak = [...byHour].sort((a, b) => b.focusMinutes - a.focusMinutes)[0];
  if (peak?.focusMinutes) notes.push(`You focus best around ${formatHour(peak.hour)} (${formatMinutes(peak.focusMinutes)} in the last ${range.days} days).`);
  if (change.completed !== null && change.completed !== 0 && totals.completed) {
    notes.push(change.completed > 0
      ? `You completed ${change.completed}% more tasks than the previous ${range.days} days.`
      : `You completed ${Math.abs(change.completed)}% fewer tasks than the previous ${range.days} days.`);
  }
  if (totals.onTimeRate !== null && totals.onTimeRate < 70) notes.push(`Only ${totals.onTimeRate}% of tasks with a due date were finished on time; try fewer tasks per day.`);
  return notes;
};
