export const elapsedMs = (s: Session, now = Date.now()) => {
  const end = s.endedAt
    ? new Date(s.endedAt).getTime()
    : s.pausedAt
      ? new Date(s.pausedAt).getTime()
      : now;
  return Math.max(0, end - new Date(s.startedAt).getTime() - s.totalPausedMs);
};

export const remainingMs = (s: Session, now = Date.now()) =>
  s.plannedMinutes ? s.plannedMinutes * 60_000 - elapsedMs(s, now) : null;

export const calcAmount = (s: Session, now = Date.now()) =>
  s.type === 'fixed'
    ? (s.planPrice ?? 0) + s.extensionAmount
    : Math.ceil((elapsedMs(s, now) / 3_600_000) * s.rate);

export const formatDuration = (ms: number) => {
  const t = Math.floor(Math.abs(ms) / 1000);
  const h = String(Math.floor(t / 3600)).padStart(2, '0');
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
  const s = String(t % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};