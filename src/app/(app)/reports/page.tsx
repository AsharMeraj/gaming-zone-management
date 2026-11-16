'use client';

import { useState } from 'react';
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
import { getReport, type Group } from '@/lib/api/reports';

const methodLabel: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
};

const formatMoney = (val: number | null | undefined) => {
  const n = Math.round(((val ?? 0) + Number.EPSILON) * 100) / 100;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

export default function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [group, setGroup] = useState<Group>('daily');

  const {
    data: r,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['report', from, to, group],
    queryFn: () => getReport(from, to, group),
  });

  const hasFilters = Boolean(from || to);

  const cards = r
    ? [
        {
          label: 'Revenue received',
          value: `${r.currency} ${formatMoney(r.totals.revenue)}`,
          accent: true,
          mono: true,
        },
        {
          label: 'Sessions',
          value: r.totals.sessions.toLocaleString(),
          mono: true,
        },
        {
          label: 'Total hours',
          value: r.totals.hours.toFixed(1),
          mono: true,
        },
        {
          label: 'Avg duration',
          value: `${Math.round(r.totals.avgMinutes)} min`,
          mono: true,
        },
        {
          label: 'Discounts given',
          value: formatMoney(r.totals.discounts),
          mono: true,
        },
        {
          label: 'Most used',
          value: r.mostUsed || '-',
          mono: false,
        },
        {
          label: 'Least used',
          value: r.leastUsed || '-',
          mono: false,
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <h1 className="text-3xl font-bold tracking-wide text-white">Reports</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="report-from"
            className="text-sm font-medium text-slate-300"
          >
            From
          </label>
          <input
            id="report-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-12 border border-white/10 bg-[#0b0e16] px-4 font-mono text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="report-to"
            className="text-sm font-medium text-slate-300"
          >
            To
          </label>
          <input
            id="report-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-12 border border-white/10 bg-[#0b0e16] px-4 font-mono text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="report-group"
            className="text-sm font-medium text-slate-300"
          >
            Group revenue
          </label>
          <select
            id="report-group"
            value={group}
            onChange={(e) => setGroup(e.target.value as Group)}
            className="h-12 border border-white/10 bg-[#0b0e16] px-4 text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setFrom('');
              setTo('');
            }}
            className="h-12 border border-white/10 bg-[#0b0e16] px-4 text-base font-medium text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-white"
          >
            Clear dates
          </button>
        )}
      </div>

      {/* Error State */}
      {isError && (
        <div className="border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-base text-rose-300">
          Failed to load reports. Check your connection or refresh the page.
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse border border-white/10 bg-[#0b0e16]"
              />
            ))}
          </div>
          <div className="h-80 animate-pulse border border-white/10 bg-[#0b0e16]" />
        </div>
      ) : (
        r && (
          <>
            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((c) => (
                <div
                  key={c.label}
                  className="flex flex-col gap-1.5 border border-white/10 bg-[#0b0e16] p-5"
                >
                  <span className="text-sm font-medium text-slate-400">
                    {c.label}
                  </span>
                  <span
                    className={`truncate text-2xl font-bold ${
                      c.mono ? 'font-mono tabular-nums' : ''
                    } ${c.accent ? 'text-cyan-300' : 'text-white'}`}
                  >
                    {c.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Revenue Trend Chart */}
            <div className="flex flex-col gap-5 border border-white/10 bg-[#0b0e16] p-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold capitalize text-white">
                  Revenue ({group})
                </h2>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={r.trend}>
                    <CartesianGrid
                      stroke="rgba(255,255,255,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      fontSize={13}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={13}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(34,211,238,0.06)' }}
                      formatter={(value) => [
                        `${r.currency} ${formatMoney(Number(value ?? 0))}`,
                        'Revenue',
                      ]}
                      contentStyle={{
                        backgroundColor: '#07080d',
                        border: '1px solid rgba(34, 211, 238, 0.35)',
                        borderRadius: 0,
                        color: '#f1f5f9',
                      }}
                      labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                    />
                    <Bar dataKey="revenue" fill="#22d3ee" maxBarSize={56} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {r.trend.length === 0 && (
                <p className="text-center text-base text-slate-500">
                  No payments in this range
                </p>
              )}
            </div>

            {/* Payment Method & Room Breakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <h2 className="text-xl font-bold text-white">
                  By Payment Method
                </h2>
                <div className="w-full overflow-x-auto border border-white/10 bg-[#0b0e16]">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03] text-sm font-semibold text-slate-300">
                        <th className="px-5 py-4">Method</th>
                        <th className="px-5 py-4 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-base">
                      {r.byMethod.length > 0 ? (
                        r.byMethod.map((m) => (
                          <tr
                            key={m.method}
                            className="transition-colors hover:bg-cyan-500/[0.04]"
                          >
                            <td className="whitespace-nowrap px-5 py-4 font-semibold text-white">
                              {methodLabel[m.method] ?? m.method}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-right font-mono font-semibold tabular-nums text-cyan-300">
                              {formatMoney(m.revenue)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={2}
                            className="px-5 py-10 text-center text-base text-slate-500"
                          >
                            No data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h2 className="text-xl font-bold text-white">By Room</h2>
                <div className="w-full overflow-x-auto border border-white/10 bg-[#0b0e16]">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03] text-sm font-semibold text-slate-300">
                        <th className="px-5 py-4">Room</th>
                        <th className="px-5 py-4 text-right">Sessions</th>
                        <th className="px-5 py-4 text-right">Hours</th>
                        <th className="px-5 py-4 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-base">
                      {r.byRoom.length > 0 ? (
                        r.byRoom.map((x) => (
                          <tr
                            key={x.id}
                            className="transition-colors hover:bg-cyan-500/[0.04]"
                          >
                            <td className="whitespace-nowrap px-5 py-4 font-semibold text-white">
                              {x.name}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-right font-mono tabular-nums text-slate-200">
                              {x.sessions}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-right font-mono tabular-nums text-slate-200">
                              {x.hours.toFixed(1)}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-right font-mono font-semibold tabular-nums text-cyan-300">
                              {formatMoney(x.revenue)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-5 py-10 text-center text-base text-slate-500"
                          >
                            No data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Station Usage Table */}
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-white">
                By Station (sorted by usage)
              </h2>
              <div className="w-full overflow-x-auto border border-white/10 bg-[#0b0e16]">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03] text-sm font-semibold text-slate-300">
                      <th className="px-5 py-4">Station</th>
                      <th className="px-5 py-4 text-right">Sessions</th>
                      <th className="px-5 py-4 text-right">Hours</th>
                      <th className="px-5 py-4 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-base">
                    {r.byStation.length > 0 ? (
                      r.byStation.map((s) => (
                        <tr
                          key={s.id}
                          className="transition-colors hover:bg-cyan-500/[0.04]"
                        >
                          <td className="whitespace-nowrap px-5 py-4 font-semibold text-white">
                            {s.name}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right font-mono tabular-nums text-slate-200">
                            {s.sessions}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right font-mono tabular-nums text-slate-200">
                            {s.hours.toFixed(1)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right font-mono font-semibold tabular-nums text-cyan-300">
                            {formatMoney(s.revenue)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-10 text-center text-base text-slate-500"
                        >
                          No data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}