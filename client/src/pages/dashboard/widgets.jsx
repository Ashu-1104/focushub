import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** Number that counts up to its value (instantly when the user prefers reduced motion). */
export function CountUp({ value, duration = 800 }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(0);

  useEffect(() => {
    if (reduce) { setShown(value); return undefined; }
    const start = performance.now();
    const begin = from.current;
    let frame;
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(begin + (value - begin) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduce]);

  return <>{shown}</>;
}

/** Ring that fills to value/total. */
export function ProgressRing({ value, total, size = 128 }) {
  const pct = total ? value / total : 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="10" />
      <motion.circle cx="60" cy="60" r={r} fill="none" stroke="white" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }}
        transition={{ duration: 1, ease: 'easeOut' }} />
    </svg>
  );
}

/** Card that fades and rises into place, staggered by `index`. */
export function Reveal({ index = 0, className = '', children, as = 'section' }) {
  const Tag = motion[as];
  return (
    <Tag className={className} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}>
      {children}
    </Tag>
  );
}

/** Live clock, updated every 30 seconds. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function DashboardSkeleton() {
  const block = 'animate-pulse rounded-2xl bg-dark-card border border-dark-border';
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your dashboard">
      <div className={`${block} h-56`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className={`${block} h-36`} />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`${block} h-96 lg:col-span-2`} />
        <div className={`${block} h-96`} />
      </div>
    </div>
  );
}
