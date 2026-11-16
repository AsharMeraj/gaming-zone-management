'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getDashboardStats } from '@/lib/api/dashboard';
import { getSessions } from '@/lib/api/sessions';
import { getStations } from '@/lib/api/stations';
import { getRooms } from '@/lib/api/rooms';
import { getCustomers } from '@/lib/api/customers';
import { elapsedMs, formatDuration, remainingMs } from '@/lib/session';
import { useNow } from '@/lib/useNow';
import { useAuth } from '@/store/auth';
import { userName } from '@/lib/users';

const statusCard: Record<StationStatus, string> = {
  available: 'border-emerald-500/40 bg-[#0b0e16]',
  occupied: 'border-cyan-400/50 bg-[#0b0e16]',
  maintenance: 'border-amber-500/40 bg-[#0b0e16]',
  unavailable: 'border-white/10 bg-[#0b0e16]/60 opacity-60',
};

const statusText: Record<StationStatus, string> = {
  available: 'text-emerald-400',
  occupied: 'text-cyan-400',
  maintenance: 'text-amber-400',
  unavailable: 'text-slate-500',
};

export default function DashboardPage() {
  const now = useNow();
  const role = useAuth((s) => s.user?.role);
  const canSeeMoney = role === 'owner' || role === 'manager';

  const { data: stats } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: getSessions,
  });
  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: getStations,
  });
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const liveByStation = useMemo(() => {
    const map = new Map<string, (typeof sessions)[number]>();
    for (const s of sessions) {
      if (s.status !== 'completed') map.set(s.stationId, s);
    }
    return map;
  }, [sessions]);

  const roomMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rooms) map.set(r.id, r.name);
    return map;
  }, [rooms]);

  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of customers) map.set(c.id, c.name);
    return map;
  }, [customers]);

  const activeStations = useMemo(
    () => stations.filter((s) => s.active),
    [stations]
  );

  const availableCount = useMemo(
    () => activeStations.filter((s) => s.status === 'available').length,
    [activeStations]
  );

  const cards = [
    ...(canSeeMoney
      ? [
          {
            label: 'Revenue Today',
            value: `${stats?.currency ?? ''} ${(stats?.revenueToday ?? 0).toLocaleString()}`.trim(),
            color: 'text-emerald-400',
          },
        ]
      : []),
    {
      label: 'Active Sessions',
      value: liveByStation.size,
      color: 'text-cyan-400',
    },
    {
      label: 'Available Stations',
      value: `${availableCount} / ${activeStations.length}`,
      color: 'text-white',
    },
    {
      label: 'Total Customers',
      value: (stats?.totalCustomers ?? 0).toLocaleString(),
      color: 'text-white',
    },
    {
      label: 'New Today',
      value: stats?.newCustomersToday ?? 0,
      color: 'text-fuchsia-400',
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-wide text-white">Dashboard</h1>

      {/* Top KPI Cards */}
      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${
          canSeeMoney ? 'xl:grid-cols-5' : 'xl:grid-cols-4'
        }`}
      >
        {cards.map((c) => (
          <div
            key={c.label}
            className="flex flex-col gap-2 border border-white/10 bg-[#0b0e16] p-5"
          >
            <span className="text-sm font-medium text-slate-400">
              {c.label}
            </span>
            <span
              className={`font-mono text-3xl font-bold tabular-nums ${c.color}`}
            >
              {c.value}
            </span>
          </div>
        ))}
      </div>

      {/* Stations Grid */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white">Stations</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {activeStations.map((st) => {
            const s = liveByStation.get(st.id);
            const rem = s ? remainingMs(s, now) : null;
            const isOvertime = rem !== null && rem < 0;
            const isPaused = s?.status === 'paused';

            const frame = isOvertime
              ? 'border-rose-500/60 bg-rose-950/20'
              : isPaused
                ? 'border-amber-500/50 bg-[#0b0e16]'
                : statusCard[st.status];

            const labelColor = isOvertime
              ? 'text-rose-400'
              : isPaused
                ? 'text-amber-400'
                : statusText[st.status];

            const labelText = isOvertime
              ? 'Overtime'
              : isPaused
                ? 'Paused'
                : st.status;

            return (
              <div
                key={st.id}
                className={`flex flex-col justify-between gap-4 border p-5 ${frame}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-white">{st.name}</p>
                    <p className="mt-0.5 text-sm text-slate-400">
                      {roomMap.get(st.roomId) ?? '-'} · {st.platform}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold capitalize ${labelColor}`}
                  >
                    {labelText}
                  </span>
                </div>

                {s ? (
                  <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
                    <span className="text-base font-medium text-slate-200">
                      {s.customerId
                        ? customerMap.get(s.customerId) ?? '-'
                        : 'Walk-in'}
                    </span>
                    <span className="font-mono text-2xl font-bold tabular-nums text-cyan-300">
                      {formatDuration(elapsedMs(s, now))}
                    </span>
                    {rem !== null && (
                      <span
                        className={`font-mono text-sm font-medium tabular-nums ${
                          isOvertime ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {isOvertime ? 'Overtime +' : 'Left '}
                        {formatDuration(Math.abs(rem))}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="border-t border-white/10 pt-3 text-base text-slate-600">
                    —
                  </div>
                )}
              </div>
            );
          })}

          {activeStations.length === 0 && (
            <p className="col-span-full text-base text-slate-500">
              No stations yet
            </p>
          )}
        </div>
      </div>

      {/* Bottom Chart & Activity */}
      <div
        className={`grid grid-cols-1 gap-6 ${
          canSeeMoney ? 'lg:grid-cols-2' : ''
        }`}
      >
        {canSeeMoney && (
          <div className="flex flex-col gap-4 border border-white/10 bg-[#0b0e16] p-6">
            <h2 className="text-xl font-bold text-white">
              Revenue (Last 7 Days)
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={stats?.last7 ?? []}>
                  <CartesianGrid
                    stroke="rgba(255,255,255,0.08)"
                    vertical={false}
                  />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={13} />
                  <YAxis stroke="#94a3b8" fontSize={13} />
                  <Tooltip
                    cursor={{ fill: 'rgba(34, 211, 238, 0.08)' }}
                    contentStyle={{
                      backgroundColor: '#07080d',
                      border: '1px solid rgba(34, 211, 238, 0.4)',
                      borderRadius: 0,
                      color: '#f8fafc',
                      fontSize: '14px',
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#22d3ee"
                    radius={[0, 0, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 border border-white/10 bg-[#0b0e16] p-6">
          <h2 className="text-xl font-bold text-white">Recent Activity</h2>
          <div className="flex flex-col divide-y divide-white/10">
            {stats?.recentLogs.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-base font-medium text-slate-100">
                    {l.action}
                  </span>
                  <span className="text-sm text-slate-400">{l.target}</span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-sm font-medium text-slate-300">
                    {userName(l.userId)}
                  </span>
                  <span className="font-mono text-sm text-slate-500">
                    {new Date(l.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}

            {(!stats?.recentLogs || stats.recentLogs.length === 0) && (
              <p className="text-base text-slate-500">No activity yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}