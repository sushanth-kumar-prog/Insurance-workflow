import { useState, useEffect, useRef } from 'react';

/**
 * SlaBreachPulse — live in-browser SLA countdown.
 *
 * Props:
 *   remainingMinutes  number  Minutes left, from the claim API's `sla.remainingMinutes`.
 *   slaType           string  'PRE_AUTH' | 'DISCHARGE'
 *   onBreach          fn      Fired once when the countdown reaches zero.
 *   paused            bool    Server-reported pause state (query loop).
 *
 * Ticks locally every second; no polling. Re-syncs when the parent supplies a
 * fresh remainingMinutes (e.g. after a refetch).
 */
export default function SlaBreachPulse({
  remainingMinutes,
  slaType = 'PRE_AUTH',
  onBreach,
  paused = false,
}) {
  const [secondsLeft, setSecondsLeft] = useState(
    Math.max(0, Math.round((remainingMinutes ?? 0) * 60))
  );
  const breachFiredRef = useRef(false);

  useEffect(() => {
    const secs = Math.max(0, Math.round((remainingMinutes ?? 0) * 60));
    setSecondsLeft(secs);
    breachFiredRef.current = secs <= 0;
  }, [remainingMinutes]);

  useEffect(() => {
    // A paused clock must not tick down.
    if (secondsLeft <= 0 || paused) return;

    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0 && !breachFiredRef.current) {
          breachFiredRef.current = true;
          if (onBreach) onBreach();
        }
        return Math.max(0, next);
      });
    }, 1000);

    return () => clearInterval(id);
  }, [secondsLeft > 0, paused, onBreach]);

  const isBreached = secondsLeft <= 0;
  const isWarning = !isBreached && secondsLeft <= 10 * 60;

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const timeStr = isBreached
    ? 'BREACHED'
    : hours > 0
      ? `${hours}h ${String(minutes).padStart(2, '0')}m`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const labelMap = {
    PRE_AUTH: 'Pre-Auth SLA (1 hr)',
    DISCHARGE: 'Discharge SLA (3 hr)',
  };

  const containerClass = isBreached
    ? 'bg-red-100 border-red-400 text-red-700 animate-pulse'
    : paused
      ? 'bg-slate-200 border-slate-400 text-slate-700'
      : isWarning
        ? 'bg-amber-100 border-amber-400 text-amber-700'
        : 'bg-green-100 border-green-400 text-green-700';

  const dotClass = isBreached
    ? 'bg-red-500 animate-ping'
    : paused
      ? 'bg-slate-500'
      : isWarning
        ? 'bg-amber-500'
        : 'bg-green-500';

  return (
    <div
      className={`inline-flex items-center gap-2 border rounded-full px-3 py-1 text-sm font-mono font-semibold select-none ${containerClass}`}
      title={`IRDAI mandate: ${labelMap[slaType] ?? slaType}`}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`} />
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotClass.replace(' animate-ping', '')}`} />
      </span>

      <span className="text-xs font-medium tracking-wide">
        {paused ? `${labelMap[slaType] ?? slaType} · PAUSED` : (labelMap[slaType] ?? slaType)}
      </span>

      <span className="text-base">{paused ? '⏸' : timeStr}</span>

      {isBreached && <span>🚨</span>}
    </div>
  );
}
