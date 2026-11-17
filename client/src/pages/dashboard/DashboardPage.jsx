import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, AlertTriangle, ArrowRight, Check, CheckCircle2, Clock, FileText, Flame, ListTodo, Loader2,
  Pencil, Plus, RefreshCw, Sparkles, Timer, Trash2, Zap,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { tasksService } from '../../services';
import { addTask, updateTask } from '../../store/slices/tasksSlice';
import { dateKey, dueDateFromKey } from '../../utils/calendar';
import { PRIORITY_COLORS, activityKind, activityText, greeting, timeAgo, useDashboardData } from './useDashboardData';
import { CountUp, DashboardSkeleton, ProgressRing, Reveal, useNow } from './widgets';

const FOCUS_GOAL = 120; // minutes a day

const STATS = [
  { key: 'todo', label: 'To do', icon: ListTodo, tone: 'bg-sky-500/15 text-sky-300', bar: 'bg-sky-400' },
  { key: 'doing', label: 'In progress', icon: Loader2, tone: 'bg-violet-500/15 text-violet-300', bar: 'bg-violet-400' },
  { key: 'done', label: 'Completed', icon: CheckCircle2, tone: 'bg-emerald-500/15 text-emerald-300', bar: 'bg-emerald-400' },
];

const ACTIVITY_STYLE = {
  created: { icon: Plus, tone: 'bg-sky-500/15 text-sky-300' },
  completed: { icon: Check, tone: 'bg-emerald-500/15 text-emerald-300' },
  updated: { icon: Pencil, tone: 'bg-violet-500/15 text-violet-300' },
  deleted: { icon: Trash2, tone: 'bg-rose-500/15 text-rose-300' },
};

const card = 'rounded-2xl border border-dark-border bg-dark-card';
const startOfToday = () => new Date(new Date().setHours(0, 0, 0, 0));

export default function DashboardPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data, error, user, reload } = useDashboardData();
  const now = useNow();
  const [quickTitle, setQuickTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [completing, setCompleting] = useState(null);

  if (error && !data) {
    return (
      <MainLayout>
        <div className={`${card} flex flex-col items-center gap-3 p-10 text-center`}>
          <AlertTriangle className="text-amber-400" />
          <p className="text-slate-300">{error}</p>
          <button type="button" onClick={reload} className="flex items-center gap-2 text-primary-400 hover:underline"><RefreshCw size={16} /> Try again</button>
        </div>
      </MainLayout>
    );
  }
  if (!data) return <MainLayout><DashboardSkeleton /></MainLayout>;

  const s = data.tasksStats;
  const total = s.todo + s.doing + s.done;
  const donePct = total ? Math.round((s.done / total) * 100) : 0;
  const focusPct = Math.min(100, Math.round((data.focusTimeToday / FOCUS_GOAL) * 100));

  const quickAdd = async (event) => {
    event.preventDefault();
    if (!quickTitle.trim()) return;
    setAdding(true);
    try {
      const response = await tasksService.create({
        title: quickTitle.trim(), priority: 'medium', dueDate: dueDateFromKey(dateKey(new Date())),
      });
      dispatch(addTask(response.data.task));
      setQuickTitle('');
      await reload();
    } finally {
      setAdding(false);
    }
  };

  const complete = async (task) => {
    setCompleting(task._id);
    try {
      const response = await tasksService.update(task._id, { status: 'done' });
      dispatch(updateTask(response.data.task));
      if (response.data.nextTask) dispatch(addTask(response.data.nextTask));
      await reload();
    } finally {
      setCompleting(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Hero */}
        <Reveal className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 via-sky-600 to-accent-600 p-6 text-white shadow-xl md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-accent-400/30 blur-3xl" />
          <div className="relative grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium uppercase tracking-widest text-white/80">
                {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                <span className="h-1 w-1 rounded-full bg-white/60" />
                <span className="tabular-nums">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </p>
              <h1 className="mt-1 text-3xl font-bold md:text-4xl">{greeting(now)}, {user?.username || 'there'}</h1>
              <p className="mt-2 text-white/90">
                {s.doing ? `${s.doing} task${s.doing === 1 ? '' : 's'} in progress` : 'Nothing in progress'}
                {data.overdue > 0 && <> · <span className="font-semibold text-amber-200">{data.overdue} overdue</span></>}
              </p>

              <form onSubmit={quickAdd} className="mt-5 flex max-w-lg items-center gap-2 rounded-2xl bg-white/15 p-1.5 backdrop-blur transition focus-within:bg-white/25">
                <Plus size={18} className="ml-2 shrink-0 text-white/80" />
                <input value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} maxLength={200}
                  placeholder="Quick add a task for today…" aria-label="Quick add a task for today"
                  className="input-on-color min-w-0 flex-1 py-1.5 placeholder:text-white/75 focus:outline-none" />
                <button type="submit" disabled={adding || !quickTitle.trim()}
                  className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-sky-700 transition hover:bg-white/90 disabled:opacity-60">
                  {adding ? 'Adding…' : 'Add'}
                </button>
              </form>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button type="button" onClick={() => navigate('/focus')}
                  className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-sky-700 shadow transition hover:-translate-y-0.5 hover:shadow-lg">
                  <Timer size={18} /> Start focus session
                </button>
                <div className="min-w-[160px] flex-1">
                  <div className="mb-1 flex justify-between text-xs text-white/85">
                    <span>Daily focus goal</span>
                    <span className="tabular-nums">{data.focusTimeToday}/{FOCUS_GOAL} min</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/20">
                    <motion.div className="h-full rounded-full bg-white" initial={{ width: 0 }} animate={{ width: `${focusPct}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="relative flex items-center justify-center self-center">
              <ProgressRing value={s.done} total={total} size={144} />
              <div className="absolute text-center">
                <p className="text-4xl font-bold tabular-nums"><CountUp value={donePct} />%</p>
                <p className="text-xs uppercase tracking-wider text-white/80">tasks done</p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Stat tiles */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map(({ key, label, icon: Icon, tone, bar }, i) => (
            <Reveal key={key} index={i + 1} as="div">
              <button type="button" onClick={() => navigate('/tasks')}
                className={`${card} group h-full w-full p-5 text-left transition hover:-translate-y-0.5 hover:border-primary-500/40`}>
                <div className="mb-3 flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></div>
                  <ArrowRight size={16} className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-primary-400" />
                </div>
                <p className="text-3xl font-bold tabular-nums text-slate-100"><CountUp value={s[key]} /></p>
                <p className="text-sm text-slate-400">{label}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-dark-hover">
                  <motion.div className={`h-full rounded-full ${bar}`} initial={{ width: 0 }}
                    animate={{ width: `${total ? (s[key] / total) * 100 : 0}%` }} transition={{ duration: 0.9, delay: 0.2 }} />
                </div>
              </button>
            </Reveal>
          ))}
          <Reveal index={4} as="div" className={`${card} relative overflow-hidden p-5`}>
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-orange-500/20 blur-2xl" />
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300"><Flame size={20} /></div>
            <p className="text-3xl font-bold tabular-nums text-slate-100"><CountUp value={data.currentStreak} /><span className="text-base font-medium text-slate-400"> day streak</span></p>
            <p className="text-sm text-slate-400">Best {data.longestStreak} days</p>
            <div className="mt-3 flex gap-1" aria-hidden="true">
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i < Math.min(data.currentStreak, 7) ? 'bg-orange-400' : 'bg-dark-hover'}`} />
              ))}
            </div>
          </Reveal>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {/* Up next + week */}
          <Reveal index={5} className={`${card} p-5 lg:col-span-2`}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100"><Zap size={18} className="text-primary-400" /> Up next</h2>
              <button type="button" onClick={() => navigate('/tasks')} className="flex items-center gap-1 text-sm text-primary-400 hover:underline">All tasks <ArrowRight size={14} /></button>
            </div>
            {data.upNext.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-slate-400">
                <Sparkles className="text-primary-400" /> No open tasks. Add one above or enjoy the calm.
              </div>
            ) : (
              <ul className="divide-y divide-dark-border">
                <AnimatePresence initial={false}>
                  {data.upNext.map((t) => (
                    <motion.li key={t._id} layout exit={{ opacity: 0, x: 24 }} className="flex items-center gap-3 py-3">
                      <button type="button" onClick={() => complete(t)} disabled={completing === t._id} aria-label={`Mark ${t.title} done`}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-500 text-transparent transition hover:border-emerald-400 hover:text-emerald-400">
                        {completing === t._id ? <Loader2 size={12} className="animate-spin text-emerald-400" /> : <Check size={12} />}
                      </button>
                      <span className="flex-1 truncate text-slate-100">{t.title}</span>
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                        style={{ color: PRIORITY_COLORS[t.priority], background: `${PRIORITY_COLORS[t.priority]}22` }}>{t.priority}</span>
                      {t.dueDate && (
                        <span className={`hidden w-20 text-right text-xs sm:block ${new Date(t.dueDate) < startOfToday() ? 'text-rose-400' : 'text-slate-400'}`}>
                          {new Date(t.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}

            <h3 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400"><Clock size={14} /> Next 7 days</h3>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {data.week.map(({ day, tasks }, i) => (
                <button key={i} type="button" onClick={() => navigate('/tasks?view=calendar')}
                  title={tasks.length ? tasks.map((t) => t.title).join('\n') : 'Nothing planned'}
                  className={`rounded-xl border p-1.5 text-center transition hover:-translate-y-0.5 hover:border-primary-500/60 sm:p-2 ${i === 0 ? 'border-primary-500 bg-primary-500/10' : 'border-dark-border'}`}>
                  <p className="text-[11px] text-slate-400 sm:text-xs">{day.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                  <p className="text-base font-semibold text-slate-100 sm:text-lg">{day.getDate()}</p>
                  <div className="mt-1 flex h-1.5 justify-center gap-0.5">
                    {tasks.slice(0, 4).map((t) => <span key={t._id} className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY_COLORS[t.priority] }} />)}
                  </div>
                </button>
              ))}
            </div>
          </Reveal>

          {/* Activity */}
          <Reveal index={6} className={`${card} p-5`}>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100"><Activity size={18} className="text-accent-400" /> Activity</h2>
            {data.activities.length === 0 ? <p className="text-slate-400">Your recent changes will show up here.</p> : (
              <ol className="space-y-4">
                {data.activities.map((a) => {
                  const { icon: Icon, tone } = ACTIVITY_STYLE[activityKind(a)];
                  return (
                    <li key={a._id} className="flex gap-3">
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon size={14} /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-100">{activityText(a)}</p>
                        <p className="text-xs text-slate-500">{timeAgo(a.createdAt)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Reveal>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {/* Recent notes */}
          <Reveal index={7} className={`${card} p-5`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100"><FileText size={18} className="text-primary-400" /> Recent notes</h2>
              <span className="text-xs text-slate-500">{data.totalNotes} total</span>
            </div>
            {data.recentNotes?.length ? (
              <ul className="space-y-1">
                {data.recentNotes.slice(0, 4).map((n) => (
                  <li key={n._id}>
                    <button type="button" onClick={() => navigate('/notes')}
                      className="w-full truncate rounded-lg px-2 py-1.5 text-left text-sm text-slate-300 transition hover:bg-dark-hover hover:text-slate-100">
                      {n.title || 'Untitled note'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-400">No notes yet.</p>}
          </Reveal>

          {/* Scratchpad (kept from the original dashboard) */}
          <Reveal index={8} className={`${card} p-5 lg:col-span-2`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Quick scratchpad</h2>
              <span className="text-xs text-slate-500">Saves automatically</span>
            </div>
            <textarea
              className="h-32 w-full resize-none rounded-xl border border-dark-border bg-transparent p-3 text-slate-100 placeholder-slate-500 transition focus:border-primary-500 focus:outline-none"
              placeholder="Jot down a quick thought, idea, or phone number…"
              defaultValue={localStorage.getItem('focushub_scratchpad') || ''}
              onChange={(e) => localStorage.setItem('focushub_scratchpad', e.target.value)}
            />
          </Reveal>
        </section>
      </div>
    </MainLayout>
  );
}
