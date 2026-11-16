'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { getLogs } from '@/lib/api/activity';
import { getUsers } from '@/lib/api/users';

const localDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA');

export default function ActivityLogPage() {
  const {
    data: logs = [],
    isLoading: logsLoading,
    isError: logsError,
  } = useQuery({ queryKey: ['logs'], queryFn: getLogs });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) map.set(u.id, u.name);
    return map;
  }, [users]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (userId && l.userId !== userId) return false;
      if (from || to) {
        const d = localDate(l.createdAt);
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      if (
        q &&
        !l.action.toLowerCase().includes(q) &&
        !l.target.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [logs, userId, from, to, search]);

  const hasFilters = Boolean(userId || search || from || to);

  const resetFilters = () => {
    setUserId('');
    setSearch('');
    setFrom('');
    setTo('');
  };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-wide text-white">
        Activity Log
      </h1>

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
            placeholder="Search action or target"
            className="h-12 w-full border border-white/10 bg-[#0b0e16] pl-11 pr-4 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
          />
        </div>

        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="h-12 border border-white/10 bg-[#0b0e16] px-4 text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
        >
          <option value="">All operators</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          aria-label="From date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-12 border border-white/10 bg-[#0b0e16] px-4 text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
        />

        <input
          type="date"
          aria-label="To date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-12 border border-white/10 bg-[#0b0e16] px-4 text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
        />

        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="h-12 border border-white/10 bg-[#0b0e16] px-4 text-base font-medium text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error State */}
      {logsError && (
        <div className="border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-base text-rose-300">
          Failed to load activity logs. Check your connection or refresh the
          page.
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-white/10 bg-[#0b0e16]">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-sm font-semibold text-slate-300">
              <th className="px-5 py-4">Timestamp</th>
              <th className="px-5 py-4">Operator</th>
              <th className="px-5 py-4">Action</th>
              <th className="px-5 py-4">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-base">
            {logsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-4">
                    <div className="h-5 w-40 bg-white/[0.06]" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-5 w-32 bg-white/[0.06]" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-5 w-36 bg-white/[0.06]" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-5 w-44 bg-white/[0.06]" />
                  </td>
                </tr>
              ))
            ) : visible.length > 0 ? (
              visible.map((l) => (
                <tr
                  key={l.id}
                  className="transition-colors hover:bg-cyan-500/[0.04]"
                >
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-sm tabular-nums text-slate-400">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-white">
                    {userMap.get(l.userId) ?? l.userId}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-sm font-semibold text-cyan-300">
                    {l.action}
                  </td>
                  <td className="px-5 py-4 font-mono text-sm text-slate-300">
                    {l.target}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-10 text-center text-base text-slate-500"
                >
                  No activity logs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}