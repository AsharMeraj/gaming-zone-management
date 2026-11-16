'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { getCustomerProfile } from '@/lib/api/customers';
import { getStations } from '@/lib/api/stations';

const formatMoney = (val: number | null | undefined) => {
  if (val == null) return '-';
  const n = Math.round((val + Number.EPSILON) * 100) / 100;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

const statusText: Record<string, string> = {
  active: 'text-cyan-400',
  running: 'text-cyan-400',
  paused: 'text-amber-400',
  completed: 'text-emerald-400',
  ended: 'text-emerald-400',
  cancelled: 'text-rose-400',
};

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomerProfile(id),
  });

  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: getStations,
  });

  const stationMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stations) map.set(s.id, s.name);
    return map;
  }, [stations]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="h-6 w-40 animate-pulse bg-white/[0.06]" />
        <div className="h-20 w-80 animate-pulse bg-white/[0.06]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse border border-white/10 bg-[#0b0e16]"
            />
          ))}
        </div>
        <div className="h-64 w-full animate-pulse border border-white/10 bg-[#0b0e16]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-4 border border-rose-500/40 bg-rose-500/10 p-6">
        <p className="text-lg font-semibold text-rose-300">
          Failed to load customer profile.
        </p>
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 border border-white/10 bg-[#07080d] px-4 py-2 text-base font-medium text-slate-200 hover:border-cyan-400/50 hover:text-white"
        >
          <ArrowLeft size={18} />
          <span>Back to Customers</span>
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-start gap-4 border border-white/10 bg-[#0b0e16] p-6">
        <p className="text-lg text-slate-400">Customer not found.</p>
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 border border-white/10 bg-[#07080d] px-4 py-2 text-base font-medium text-cyan-300 hover:border-cyan-400/50 hover:text-white"
        >
          <ArrowLeft size={18} />
          <span>Back to Customers</span>
        </Link>
      </div>
    );
  }

  const { customer, sessions, stats } = data;

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/customers"
        className="inline-flex w-fit items-center gap-2 text-base font-medium text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft size={18} />
        <span>Back to Customers</span>
      </Link>

      {/* Player Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-wide text-white">
          {customer.name}
        </h1>
        <p className="text-base text-slate-300">
          <span className="font-mono">{customer.phone}</span>
          {customer.email ? ` · ${customer.email}` : ''}
          <span className="font-mono text-slate-500"> · {customer.id}</span>
        </p>
        {customer.notes && (
          <p className="text-base text-slate-400">{customer.notes}</p>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2 border border-white/10 bg-[#0b0e16] p-5">
          <span className="text-sm font-medium text-slate-400">
            Total Sessions
          </span>
          <span className="font-mono text-3xl font-bold tabular-nums text-white">
            {stats.sessions}
          </span>
        </div>

        <div className="flex flex-col gap-2 border border-white/10 bg-[#0b0e16] p-5">
          <span className="text-sm font-medium text-slate-400">
            Total Spent
          </span>
          <span className="font-mono text-3xl font-bold tabular-nums text-emerald-400">
            {formatMoney(stats.spent)}
          </span>
        </div>

        <div className="flex flex-col gap-2 border border-white/10 bg-[#0b0e16] p-5">
          <span className="text-sm font-medium text-slate-400">
            Total Hours
          </span>
          <span className="font-mono text-3xl font-bold tabular-nums text-cyan-400">
            {stats.hours.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Session History */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white">Session History</h2>

        <div className="overflow-x-auto border border-white/10 bg-[#0b0e16]">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-sm font-semibold text-slate-300">
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Station</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Total</th>
                <th className="px-5 py-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-base">
              {sessions.length > 0 ? (
                sessions.map((s) => (
                  <tr
                    key={s.id}
                    className="transition-colors hover:bg-cyan-500/[0.04]"
                  >
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-sm tabular-nums text-slate-300">
                      {new Date(s.startedAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-white">
                      {stationMap.get(s.stationId) ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 capitalize text-slate-300">
                      {s.type}
                    </td>
                    <td
                      className={`whitespace-nowrap px-5 py-4 font-medium capitalize ${
                        statusText[s.status] ?? 'text-slate-300'
                      }`}
                    >
                      {s.status}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-mono font-semibold tabular-nums text-slate-100">
                      {formatMoney(s.total)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <Link
                        href={`/billing/${s.id}`}
                        className="border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-sm font-medium text-cyan-300 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-base text-slate-500"
                  >
                    No sessions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}