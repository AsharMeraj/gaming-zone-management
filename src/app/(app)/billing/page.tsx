'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { getSessionHistory } from '@/lib/api/sessions';
import { getStations } from '@/lib/api/stations';
import { getCustomers } from '@/lib/api/customers';

const payColor: Record<string, string> = {
  paid: 'text-emerald-400',
  partial: 'text-amber-400',
  unpaid: 'text-rose-400',
};

const roundMoney = (val: number) =>
  Math.round((val + Number.EPSILON) * 100) / 100;

const formatAmount = (val: number | null | undefined) => {
  const n = roundMoney(val ?? 0);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

export default function BillingPage() {
  const {
    data: rows = [],
    isLoading: rowsLoading,
    isError: rowsError,
  } = useQuery({
    queryKey: ['session-history'],
    queryFn: getSessionHistory,
  });

  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: getStations,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const [search, setSearch] = useState('');
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

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((s) => {
      if (pay && s.paymentStatus !== pay) return false;
      if (!q) return true;

      const invoice = (s.invoiceNo ?? s.id).toLowerCase();
      const customer = (
        s.customerId ? customerMap.get(s.customerId) ?? '-' : 'Walk-in'
      ).toLowerCase();
      const station = (stationMap.get(s.stationId) ?? '').toLowerCase();

      return (
        invoice.includes(q) || customer.includes(q) || station.includes(q)
      );
    });
  }, [rows, pay, search, customerMap, stationMap]);

  const totals = useMemo(() => {
    let billed = 0;
    let collected = 0;
    for (const s of visible) {
      billed += s.total ?? 0;
      collected += s.paid ?? 0;
    }
    return {
      billed: roundMoney(billed),
      collected: roundMoney(collected),
      balance: roundMoney(billed - collected),
    };
  }, [visible]);

  const hasFilters = Boolean(search || pay);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-wide text-white">Billing</h1>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2 border border-white/10 bg-[#0b0e16] p-5">
          <span className="text-sm font-medium text-slate-400">
            Total Billed
          </span>
          <span className="font-mono text-3xl font-bold tabular-nums text-white">
            {rowsLoading ? '—' : formatAmount(totals.billed)}
          </span>
        </div>

        <div className="flex flex-col gap-2 border border-white/10 bg-[#0b0e16] p-5">
          <span className="text-sm font-medium text-slate-400">Collected</span>
          <span className="font-mono text-3xl font-bold tabular-nums text-emerald-400">
            {rowsLoading ? '—' : formatAmount(totals.collected)}
          </span>
        </div>

        <div className="flex flex-col gap-2 border border-white/10 bg-[#0b0e16] p-5">
          <span className="text-sm font-medium text-slate-400">Balance</span>
          <span
            className={`font-mono text-3xl font-bold tabular-nums ${
              totals.balance > 0 ? 'text-rose-400' : 'text-slate-300'
            }`}
          >
            {rowsLoading ? '—' : formatAmount(totals.balance)}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice, customer, or station"
            className="h-12 w-full border border-white/10 bg-[#0b0e16] pl-11 pr-4 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
          />
        </div>

        <select
          value={pay}
          onChange={(e) => setPay(e.target.value)}
          className="h-12 border border-white/10 bg-[#0b0e16] px-4 text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
        >
          <option value="">All payments</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setPay('');
            }}
            className="h-12 border border-white/10 bg-[#0b0e16] px-4 text-base font-medium text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error State */}
      {rowsError && (
        <div className="border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-base text-rose-300">
          Failed to load billing records. Check your connection or refresh the
          page.
        </div>
      )}

      {/* Invoices Table */}
      <div className="overflow-x-auto border border-white/10 bg-[#0b0e16]">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-sm font-semibold text-slate-300">
              <th className="px-5 py-4">Invoice</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">Station</th>
              <th className="px-5 py-4 text-right">Total</th>
              <th className="px-5 py-4 text-right">Paid</th>
              <th className="px-5 py-4 text-right">Balance</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-base">
            {rowsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-5 w-20 bg-white/[0.06]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visible.length > 0 ? (
              visible.map((s) => {
                const balance = roundMoney((s.total ?? 0) - (s.paid ?? 0));
                const customerLabel = s.customerId
                  ? customerMap.get(s.customerId) ?? '-'
                  : 'Walk-in';

                return (
                  <tr
                    key={s.id}
                    className="transition-colors hover:bg-cyan-500/[0.04]"
                  >
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-sm font-semibold text-cyan-300">
                      {s.invoiceNo ?? s.id}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-sm tabular-nums text-slate-400">
                      {new Date(s.endedAt ?? s.startedAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-white">
                      {customerLabel}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-300">
                      {stationMap.get(s.stationId) ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-mono tabular-nums text-slate-200">
                      {formatAmount(s.total)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-mono tabular-nums text-emerald-400">
                      {formatAmount(s.paid)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-5 py-4 text-right font-mono font-semibold tabular-nums ${
                        balance > 0 ? 'text-rose-400' : 'text-slate-500'
                      }`}
                    >
                      {formatAmount(balance)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-5 py-4 font-semibold capitalize ${
                        payColor[s.paymentStatus] ?? 'text-slate-300'
                      }`}
                    >
                      {s.paymentStatus}
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
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={9}
                  className="px-5 py-10 text-center text-base text-slate-500"
                >
                  No invoices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}