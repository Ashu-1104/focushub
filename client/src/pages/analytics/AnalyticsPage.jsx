import { useEffect, useMemo, useState } from 'react';
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { motion } from 'framer-motion';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, CalendarCheck, CheckCircle2, Clock, Lightbulb, RefreshCw, Target, Trophy,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { analyticsService } from '../../services';
import { TASKS_CHANGED_EVENT } from '../../hooks/useRealtimeSync';
import { formatDay, formatHour, formatMinutes, heatLevel, heatmapWeeks, insights } from '../../utils/analytics';

const RANGES = [7, 30, 90];
const PRIMARY = '#00d9ff';
const ACCENT = '#9945ff';
const PRIORITY_COLORS = { urgent: '#f87171', high: '#fb923c', medium: '#60a5fa', low: '#94a3b8' };
const HEAT_COLORS = ['var(--heat-0)', 'rgba(0,217,255,.25)', 'rgba(0,217,255,.45)', 'rgba(0,217,255,.7)', '#00d9ff'];
const card = 'rounded-2xl border border-dark-border bg-dark-card p-5';
const axis = { stroke: '#64748b', fontSize: 12, tickLine: false, axisLine: false };

function ChartTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-dark-border bg-dark-base/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
      <p className="mb-1 font-medium text-slate-100">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-slate-300">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload.fill }} />
          {p.name}: <b className="text-slate-100">{p.dataKey === 'focusMinutes' ? formatMinutes(p.value) : p.value}</b>
        </p>
      ))}
    </div>
  );
}

function Kpi({ icon: Icon, tone, label, value, sub, change, index }) {
  return (
    <motion.div className={card} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon size={18} /></div>
        {change !== undefined && change !== null && change !== 0 && (
          <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${change > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
            {change > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tabular-nums text-slate-100">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </motion.div>
  );
}

function Heatmap({ cells }) {
  const weeks = heatmapWeeks(cells);
  const max = Math.max(0, ...cells.map((c) => c.count));
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1" role="img" aria-label="Activity over the last 12 weeks">
        <div className="mr-1 grid grid-rows-7 gap-1 text-[10px] text-slate-500">
          {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((d, i) => <span key={i} className="flex h-3.5 items-center">{d}</span>)}
        </div>
        {weeks.map((week, w) => (
          <div key={w} className="grid grid-rows-7 gap-1">
            {week.map((cell, d) => (cell ? (
              <span key={d} className="h-3.5 w-3.5 rounded-[3px]" style={{ background: HEAT_COLORS[heatLevel(cell.count, max)] }}
                title={`${formatDay(cell.date, { weekday: 'short', day: 'numeric', month: 'short' })}: ${cell.count} ${cell.count === 1 ? 'thing' : 'things'} done`} />
            ) : <span key={d} className="h-3.5 w-3.5" />))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1 text-[11px] text-slate-500">
        Less {HEAT_COLORS.map((c, i) => <span key={i} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />)} More
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    analyticsService.get(days)
      .then((res) => { if (alive) { setData(res.data); setError(''); } })
      .catch(() => { if (alive) setError('Could not load analytics.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days, version]);

  // stay current when tasks change in another tab or device
  useEffect(() => {
    const refresh = () => setVersion((v) => v + 1);
    window.addEventListener(TASKS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, refresh);
  }, []);

  const notes = useMemo(() => (data ? insights(data) : []), [data]);
  const peakHour = data ? [...data.byHour].sort((a, b) => b.focusMinutes - a.focusMinutes)[0] : null;
  const priorityTotal = data ? data.byPriority.reduce((sum, p) => sum + p.completed, 0) : 0;
  const dayTick = (iso) => formatDay(iso, days === 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' });

  return (
    <MainLayout>
      <div className="space-y-6" style={{ '--heat-0': 'rgba(148,163,184,.12)' }}>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-100"><BarChart3 className="text-primary-400" /> Analytics</h1>
            <p className="text-slate-400">How you've been working{data ? `, ${formatDay(data.range.start)} – ${formatDay(data.range.end)}` : ''}.</p>
          </div>
          <div className="flex rounded-xl border border-dark-border p-1" role="tablist" aria-label="Time range">
            {RANGES.map((r) => (
              <button key={r} type="button" role="tab" aria-selected={days === r} onClick={() => setDays(r)}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${days === r ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-slate-100'}`}>
                {r} days
              </button>
            ))}
          </div>
        </header>

        {error && !data && (
          <div className={`${card} flex items-center gap-3 text-slate-300`}>
            <AlertTriangle className="text-amber-400" /> {error}
            <button type="button" className="ml-auto flex items-center gap-1 text-primary-400" onClick={() => setVersion((v) => v + 1)}><RefreshCw size={14} /> Retry</button>
          </div>
        )}

        {!data && !error && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl border border-dark-border bg-dark-card" />)}
          </div>
        )}

        {data && (
          <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <Kpi index={0} icon={CheckCircle2} tone="bg-emerald-500/15 text-emerald-300" label="Tasks completed" value={data.totals.completed}
                change={data.change.completed} sub={`vs previous ${days} days`} />
              <Kpi index={1} icon={Clock} tone="bg-sky-500/15 text-sky-300" label="Focus time" value={formatMinutes(data.totals.focusMinutes)}
                change={data.change.focusMinutes} sub={`${formatMinutes(data.totals.avgFocusPerDay)} a day · ${data.totals.sessions} sessions`} />
              <Kpi index={2} icon={Target} tone="bg-violet-500/15 text-violet-300" label="Completion rate"
                value={data.totals.completionRate === null ? '—' : `${data.totals.completionRate}%`} sub={`${data.totals.created} tasks created`} />
              <Kpi index={3} icon={CalendarCheck} tone="bg-amber-500/15 text-amber-300" label="Finished on time"
                value={data.totals.onTimeRate === null ? '—' : `${data.totals.onTimeRate}%`} sub="of tasks with a due date" />
              <Kpi index={4} icon={Trophy} tone="bg-orange-500/15 text-orange-300" label="Best day"
                value={data.totals.bestDay ? data.totals.bestDay.completed : '—'}
                sub={data.totals.bestDay ? formatDay(data.totals.bestDay.date, { weekday: 'long', day: 'numeric', month: 'short' }) : 'No tasks completed yet'} />
            </section>

            {notes.length > 0 && (
              <section className={`${card} border-primary-500/30 bg-gradient-to-r from-primary-500/10 to-accent-500/10`}>
                <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-100"><Lightbulb size={18} className="text-amber-300" /> Insights</h2>
                <ul className="grid gap-1.5 text-sm text-slate-300 md:grid-cols-2">
                  {notes.map((n) => <li key={n} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary-400" />{n}</li>)}
                </ul>
              </section>
            )}

            <section className={card}>
              <h2 className="mb-1 font-semibold text-slate-100">Daily activity</h2>
              <p className="mb-4 text-sm text-slate-400">Tasks completed and minutes of focus, day by day.</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.daily} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="focusFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor={ACCENT} stopOpacity={0.45} /><stop offset="1" stopColor={ACCENT} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={dayTick} {...axis} minTickGap={16} />
                    <YAxis yAxisId="tasks" allowDecimals={false} {...axis} />
                    <YAxis yAxisId="focus" orientation="right" {...axis} tickFormatter={(m) => formatMinutes(m)} width={52} />
                    <Tooltip content={<ChartTooltip labelFormatter={(d) => formatDay(d, { weekday: 'long', day: 'numeric', month: 'long' })} />} cursor={{ fill: 'rgba(148,163,184,.08)' }} />
                    <Area yAxisId="focus" type="monotone" dataKey="focusMinutes" name="Focus" stroke={ACCENT} strokeWidth={2} fill="url(#focusFill)" />
                    <Bar yAxisId="tasks" dataKey="completed" name="Tasks done" fill={PRIMARY} radius={[6, 6, 0, 0]} maxBarSize={28} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className={card}>
                <h2 className="mb-1 font-semibold text-slate-100">By weekday</h2>
                <p className="mb-4 text-sm text-slate-400">Which days you get the most done.</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byWeekday} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} />
                      <XAxis dataKey="day" {...axis} />
                      <YAxis allowDecimals={false} {...axis} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,.08)' }} />
                      <Bar dataKey="completed" name="Tasks done" fill={PRIMARY} radius={[6, 6, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={card}>
                <h2 className="mb-1 font-semibold text-slate-100">When you focus</h2>
                <p className="mb-4 text-sm text-slate-400">
                  {peakHour?.focusMinutes ? `Your peak is around ${formatHour(peakHour.hour)}.` : 'Focus sessions by hour of day.'}
                </p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byHour} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} />
                      <XAxis dataKey="hour" tickFormatter={formatHour} {...axis} interval={3} />
                      <YAxis {...axis} tickFormatter={(m) => formatMinutes(m)} width={48} />
                      <Tooltip content={<ChartTooltip labelFormatter={formatHour} />} cursor={{ fill: 'rgba(148,163,184,.08)' }} />
                      <Bar dataKey="focusMinutes" name="Focus" radius={[4, 4, 0, 0]}>
                        {data.byHour.map((h) => <Cell key={h.hour} fill={h.hour === peakHour?.hour && h.focusMinutes ? ACCENT : 'rgba(153,69,255,.45)'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <div className={card}>
                <h2 className="mb-1 font-semibold text-slate-100">Completed by priority</h2>
                <p className="mb-2 text-sm text-slate-400">Where your effort went.</p>
                {priorityTotal === 0 ? <p className="py-10 text-center text-sm text-slate-500">No tasks completed in this period.</p> : (
                  <div className="flex items-center gap-4">
                    <div className="h-44 w-44 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={data.byPriority.filter((p) => p.completed)} dataKey="completed" nameKey="priority" innerRadius="62%" outerRadius="100%"
                            paddingAngle={2} stroke="none">
                            {data.byPriority.filter((p) => p.completed).map((p) => <Cell key={p.priority} fill={PRIORITY_COLORS[p.priority]} />)}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {data.byPriority.map((p) => (
                        <li key={p.priority} className="flex items-center gap-2 capitalize text-slate-300">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: PRIORITY_COLORS[p.priority] }} />
                          {p.priority} <b className="ml-auto pl-3 text-slate-100">{p.completed}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className={`${card} lg:col-span-2`}>
                <h2 className="mb-1 font-semibold text-slate-100">Last 12 weeks</h2>
                <p className="mb-4 text-sm text-slate-400">Every square is a day: tasks completed plus focus sessions.</p>
                <Heatmap cells={data.heatmap} />
              </div>
            </section>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
