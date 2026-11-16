import { db } from '@/store/db';
import { elapsedMs } from '@/lib/session';

export type Group = 'daily' | 'weekly' | 'monthly';

const day = (d: string | Date) => new Date(d).toLocaleDateString('en-CA');

const bucket = (iso: string, group: Group) => {
  const d = new Date(iso);
  if (group === 'monthly') return day(d).slice(0, 7);
  if (group === 'weekly') {
    const monday = new Date(d);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return day(monday);
  }
  return day(d);
};

const METHODS: PaymentMethod[] = ['cash', 'card', 'bank_transfer', 'other'];

export const getReport = async (from: string, to: string, group: Group) => {
  const { payments, sessions, stations, rooms, settings } = db();
  const inRange = (iso: string) => {
    const d = day(iso);
    return (!from || d >= from) && (!to || d <= to);
  };

  const pays = payments.filter((p) => inRange(p.createdAt));
  const done = sessions.filter((s) => s.status === 'completed' && s.endedAt && inRange(s.endedAt));

  // revenue trend
  const buckets = new Map<string, number>();
  pays.forEach((p) => {
    const k = bucket(p.createdAt, group);
    buckets.set(k, (buckets.get(k) ?? 0) + p.amount);
  });
  const trend = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, revenue]) => ({ label: group === 'weekly' ? `Wk ${label}` : label, revenue }));

  // by station
  const stationOfSession = new Map(sessions.map((s) => [s.id, s.stationId]));
  const byStation = stations
    .map((st) => {
      const mine = done.filter((s) => s.stationId === st.id);
      return {
        id: st.id,
        name: st.name,
        roomId: st.roomId,
        active: st.active,
        sessions: mine.length,
        hours: mine.reduce((n, s) => n + elapsedMs(s), 0) / 3_600_000,
        revenue: pays.filter((p) => stationOfSession.get(p.sessionId) === st.id).reduce((n, p) => n + p.amount, 0),
      };
    })
    .filter((s) => s.active || s.sessions > 0 || s.revenue > 0)
    .sort((a, b) => b.hours - a.hours);

  // by room
  const byRoom = rooms
    .map((r) => {
      const mine = byStation.filter((s) => s.roomId === r.id);
      return {
        id: r.id,
        name: r.name,
        sessions: mine.reduce((n, s) => n + s.sessions, 0),
        hours: mine.reduce((n, s) => n + s.hours, 0),
        revenue: mine.reduce((n, s) => n + s.revenue, 0),
      };
    })
    .filter((r) => r.sessions > 0 || r.revenue > 0);

  // by payment method
  const byMethod = METHODS.map((m) => ({
    method: m,
    revenue: pays.filter((p) => p.method === m).reduce((n, p) => n + p.amount, 0),
  }));

  const totalMs = done.reduce((n, s) => n + elapsedMs(s), 0);
  const used = byStation.filter((s) => s.sessions > 0);

  return {
    currency: settings.currency,
    totals: {
      revenue: pays.reduce((n, p) => n + p.amount, 0),
      sessions: done.length,
      hours: totalMs / 3_600_000,
      avgMinutes: done.length ? totalMs / done.length / 60_000 : 0,
      discounts: done.reduce((n, s) => n + s.discount, 0),
    },
    trend,
    byStation,
    byRoom,
    byMethod,
    mostUsed: used[0]?.name ?? '-',
    leastUsed: byStation.filter((s) => s.active).at(-1)?.name ?? '-',
  };
};