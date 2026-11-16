'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { getSessionHistory } from '@/lib/api/sessions';
import { getStations } from '@/lib/api/stations';
import { getCustomers } from '@/lib/api/customers';
import { elapsedMs, formatDuration } from '@/lib/session';
import { userName } from '@/lib/users';

const payColor: Record<'paid' | 'partial' | 'unpaid', string> = {
  paid: 'text-emerald-400',
  partial: 'text-amber-400',
  unpaid: 'text-rose-400',
};

const localDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA');

const formatMoney = (val: number | null | undefined) => {
  const n = Math.round(((val ?? 0) + Number.EPSILON) * 100) / 100;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

export default function SessionHistoryPage() {
  const {
    data: rows = [],
    isLoading,
    isError,
  } = useQuery({ queryKey: ['session-history'], queryFn: getSessionHistory });

  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: getStations,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [stationId, setStationId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [pay, setPay] = useState('');

  const stationMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stations) map.set(s.id, s.name);
    return map;
  }, [stations]);

  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of customers) map.set(c.id, c.name);
    return map;
  }, [customers]);

  const visible = useMemo(
    () =>
      rows.filter((s) => {
        const d = localDate(s.startedAt);
        return (
          (!from || d >= from) &&
          (!to || d <= to) &&
          (!stationId || s.stationId === stationId) &&
          (!customerId ||
            (customerId === 'walkin'
              ? s.customerId === null
              : s.customerId === customerId)) &&
          (!pay || s.paymentStatus === pay)
        );
      }),
    [rows, from, to, stationId, customerId, pay]
  );

  const hasFilters = Boolean(from || to || stationId || customerId || pay);

  const clearFilters = () => {
    setFrom('');
    setTo('');
    setStationId('');
    setCustomerId('');
    setPay('');
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Link
          href="/sessions"
          className="inline-flex w-fit items-center gap-2 text-base font-medium text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={18} />
          <span>Back to Sessions</span>
        </Link>
        <h1 className="text-3xl font-bold tracking-wide text-white">
          Session History
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          aria-label="From date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-12 border border-white/10 bg-[#0b0e16] px-4 font-mono text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
        />

        <input
          type="date"
          aria-label="To date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-12 border border-white/10 bg-[#0b0e16] px-4 font-mono text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
        />

        <select
          aria-label="Filter by station"
          value={stationId}
          onChange={(e) => setStationId(e.target.value)}
          className="h-12 border border-white/10 bg-[#0b0e16] px-4 text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
        >
          <option value="">All stations</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by customer"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="h-12 border border-white/10 bg-[#0b0e16] px-4 text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
        >
          <option value="">All customers</option>
          <option value="walkin">Walk-in</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by payment status"
          value={pay}
          onChange={(e) => setPay(e.target.value)}
          className="h-12 border border-white/10 bg-[#0b0e16] px-4 text-base capitalize text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
        >
          <option value="">All payments</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="h-12 border border-white/10 bg-[#0b0e16] px-4 text-base font-medium text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error State */}
      {isError && (
        <div className="border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-base text-rose-300">
          Failed to load session history. Check your connection or refresh the
          page.
        </div>
      )}

      {/* History Table */}
      <div className="w-full overflow-x-auto border border-white/10 bg-[#0b0e16]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-sm font-semibold text-slate-300">
              <th className="px-3.5 py-4">Started</th>
              <th className="px-3.5 py-4">Customer</th>
              <th className="px-3.5 py-4">Station</th>
              <th className="px-3.5 py-4">Type</th>
              <th className="px-3.5 py-4">Duration</th>
              <th className="px-3.5 py-4 text-right">Discount</th>
              <th className="px-3.5 py-4 text-right">Total</th>
              <th className="px-3.5 py-4">Payment</th>
              <th className="px-3.5 py-4">Cashier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-base">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j} className="px-3.5 py-4">
                      <div className="h-5 w-20 bg-white/[0.06]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visible.length > 0 ? (
              visible.map((s) => (
                <tr
                  key={s.id}
                  className="transition-colors hover:bg-cyan-500/[0.04]"
                >
                  <td className="whitespace-nowrap px-3.5 py-4 font-mono tabular-nums text-slate-400">
                    {new Date(s.startedAt).toLocaleString()}
                  </td>
                  <td className="px-3.5 py-4 font-semibold text-white">
                    {s.customerId
                      ? customerMap.get(s.customerId) ?? '-'
                      : 'Walk-in'}
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-4 text-slate-300">
                    {stationMap.get(s.stationId) ?? '-'}
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-4 capitalize text-slate-200">
                    {s.planName ?? s.type}
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-4 font-mono tabular-nums text-slate-200">
                    {formatDuration(elapsedMs(s))}
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-4 text-right font-mono tabular-nums text-slate-400">
                    {formatMoney(s.discount)}
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-4 text-right font-mono font-semibold tabular-nums text-cyan-300">
                    {formatMoney(s.total)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-3.5 py-4 font-semibold capitalize ${
                      payColor[s.paymentStatus] ?? 'text-slate-300'
                    }`}
                  >
                    {s.paymentStatus}
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-4 text-slate-300">
                    {userName(s.cashierId)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={9}
                  className="px-5 py-10 text-center text-base text-slate-500"
                >
                  No sessions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}