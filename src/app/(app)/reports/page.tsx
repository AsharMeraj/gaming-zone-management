'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getReport, type Group } from '@/lib/api/reports';

const methodLabel: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
};

export default function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [group, setGroup] = useState<Group>('daily');

  const { data: r } = useQuery({
    queryKey: ['report', from, to, group],
    queryFn: () => getReport(from, to, group),
  });

  if (!r) return null;

  const cards = [
    { label: 'Revenue received', value: `${r.currency} ${r.totals.revenue}` },
    { label: 'Sessions', value: r.totals.sessions },
    { label: 'Total hours', value: r.totals.hours.toFixed(1) },
    { label: 'Avg duration', value: `${Math.round(r.totals.avgMinutes)} min` },
    { label: 'Discounts given', value: r.totals.discounts },
    { label: 'Most used', value: r.mostUsed },
    { label: 'Least used', value: r.leastUsed },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Reports</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">Group revenue</label>
          <select value={group} onChange={(e) => setGroup(e.target.value as Group)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo(''); }}
            className="pb-2 text-sm text-neutral-400 hover:text-white">
            Clear dates
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="flex flex-col gap-1 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <span className="text-xs text-neutral-400">{c.label}</span>
            <span className="text-xl font-semibold">{c.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="font-medium">Revenue ({group})</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={r.trend}>
              <CartesianGrid stroke="#262626" vertical={false} />
              <XAxis dataKey="label" stroke="#737373" fontSize={12} />
              <YAxis stroke="#737373" fontSize={12} />
              <Tooltip
                cursor={{ fill: '#262626' }}
                contentStyle={{ background: '#171717', border: '1px solid #404040', borderRadius: 8 }}
              />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {r.trend.length === 0 && <p className="text-sm text-neutral-500">No payments in this range</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          <h2 className="font-medium">By Payment Method</h2>
          <div className="overflow-hidden rounded-xl border border-neutral-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {r.byMethod.map((m) => (
                  <tr key={m.method} className="border-t border-neutral-800">
                    <td className="px-4 py-3">{methodLabel[m.method]}</td>
                    <td className="px-4 py-3">{m.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-medium">By Room</h2>
          <div className="overflow-hidden rounded-xl border border-neutral-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Room</th>
                  <th className="px-4 py-3 font-medium">Sessions</th>
                  <th className="px-4 py-3 font-medium">Hours</th>
                  <th className="px-4 py-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {r.byRoom.map((x) => (
                  <tr key={x.id} className="border-t border-neutral-800">
                    <td className="px-4 py-3">{x.name}</td>
                    <td className="px-4 py-3">{x.sessions}</td>
                    <td className="px-4 py-3">{x.hours.toFixed(1)}</td>
                    <td className="px-4 py-3">{x.revenue}</td>
                  </tr>
                ))}
                {r.byRoom.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">No data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <h2 className="font-medium">By Station (sorted by usage)</h2>
      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Station</th>
              <th className="px-4 py-3 font-medium">Sessions</th>
              <th className="px-4 py-3 font-medium">Hours</th>
              <th className="px-4 py-3 font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {r.byStation.map((s) => (
              <tr key={s.id} className="border-t border-neutral-800">
                <td className="px-4 py-3">{s.name}</td>
                <td className="px-4 py-3">{s.sessions}</td>
                <td className="px-4 py-3">{s.hours.toFixed(1)}</td>
                <td className="px-4 py-3">{s.revenue}</td>
              </tr>
            ))}
            {r.byStation.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}