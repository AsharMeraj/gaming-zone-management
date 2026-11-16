'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { closeShift, getShifts, openShift } from '@/lib/api/shifts';
import { useAuth } from '@/store/auth';
import { userName } from '@/lib/users';

const roundMoney = (val: number) =>
  Math.round((val + Number.EPSILON) * 100) / 100;

const formatMoney = (val: number | null | undefined) => {
  const n = roundMoney(val ?? 0);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

const diffColor = (n: number) =>
  roundMoney(n) === 0 ? 'text-emerald-400' : 'text-rose-400';

export default function ShiftsPage() {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const {
    data: shifts = [],
    isLoading,
    isError,
  } = useQuery({ queryKey: ['shifts'], queryFn: getShifts });

  const [opening, setOpening] = useState('');
  const [actual, setActual] = useState('');
  const [error, setError] = useState('');

  const mine = shifts.filter((s) => s.cashierId === user?.id);
  const current = mine.find((s) => !s.closedAt);
  const visible = user?.role === 'cashier' ? mine : shifts;

  const done = () => {
    setError('');
    qc.invalidateQueries({ queryKey: ['shifts'] });
  };

  const open = useMutation({
    mutationFn: () => openShift(user!.id, roundMoney(Number(opening))),
    onSuccess: () => {
      setOpening('');
      done();
    },
    onError: (e: Error) => setError(e.message),
  });

  const close = useMutation({
    mutationFn: () => closeShift(current!.id, roundMoney(Number(actual))),
    onSuccess: () => {
      setActual('');
      done();
    },
    onError: (e: Error) => setError(e.message),
  });

  const parsedOpening = Number(opening);
  const validOpening =
    opening.trim() !== '' &&
    Number.isFinite(parsedOpening) &&
    parsedOpening >= 0;

  const parsedActual = Number(actual);
  const validActual =
    actual.trim() !== '' && Number.isFinite(parsedActual) && parsedActual >= 0;

  const diff =
    current && validActual
      ? roundMoney(parsedActual - current.summary.expectedCash)
      : 0;

  const handleOpenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !validOpening || open.isPending) return;
    open.mutate();
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !validActual || close.isPending) return;
    close.mutate();
  };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-wide text-white">Shifts</h1>

      {/* Active / Start Shift Panel */}
      {isLoading ? (
        <div className="h-44 w-full animate-pulse border border-white/10 bg-[#0b0e16]" />
      ) : (
        <div className="flex flex-col gap-6 border border-white/10 bg-[#0b0e16] p-6">
          {!current ? (
            <form onSubmit={handleOpenSubmit} className="flex flex-col gap-5">
              <h2 className="text-xl font-bold text-white">Start Shift</h2>

              <div className="flex flex-wrap items-end gap-4">
                <div className="flex w-full flex-col gap-2 sm:w-56">
                  <label
                    htmlFor="opening-cash"
                    className="text-sm font-medium text-slate-300"
                  >
                    Opening cash
                  </label>
                  <input
                    id="opening-cash"
                    type="number"
                    step="any"
                    min={0}
                    value={opening}
                    placeholder="0"
                    onChange={(e) => {
                      setOpening(e.target.value);
                      if (error) setError('');
                    }}
                    className="h-12 w-full border border-white/10 bg-[#07080d] px-4 font-mono text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!user || !validOpening || open.isPending}
                  className="h-12 border border-cyan-400/50 bg-cyan-500/20 px-6 text-base font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {open.isPending ? 'Starting...' : 'Start Shift'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold text-white">Current Shift</h2>
                <span className="font-mono text-sm text-slate-400">
                  Started {new Date(current.openedAt).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <div className="flex flex-col gap-1.5 border border-white/10 bg-[#07080d] p-4">
                  <span className="text-sm font-medium text-slate-400">
                    Opening cash
                  </span>
                  <span className="font-mono text-2xl font-bold tabular-nums text-white">
                    {formatMoney(current.openingCash)}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 border border-white/10 bg-[#07080d] p-4">
                  <span className="text-sm font-medium text-slate-400">
                    Cash sales
                  </span>
                  <span className="font-mono text-2xl font-bold tabular-nums text-white">
                    {formatMoney(current.summary.cash)}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 border border-white/10 bg-[#07080d] p-4">
                  <span className="text-sm font-medium text-slate-400">
                    Card sales
                  </span>
                  <span className="font-mono text-2xl font-bold tabular-nums text-white">
                    {formatMoney(current.summary.card)}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 border border-white/10 bg-[#07080d] p-4">
                  <span className="text-sm font-medium text-slate-400">
                    Other
                  </span>
                  <span className="font-mono text-2xl font-bold tabular-nums text-white">
                    {formatMoney(
                      current.summary.bankTransfer + current.summary.other
                    )}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 border border-white/10 bg-[#07080d] p-4">
                  <span className="text-sm font-medium text-slate-400">
                    Expected cash
                  </span>
                  <span className="font-mono text-2xl font-bold tabular-nums text-cyan-300">
                    {formatMoney(current.summary.expectedCash)}
                  </span>
                </div>
              </div>

              <form
                onSubmit={handleCloseSubmit}
                className="flex flex-wrap items-end gap-4"
              >
                <div className="flex w-full flex-col gap-2 sm:w-56">
                  <label
                    htmlFor="actual-cash"
                    className="text-sm font-medium text-slate-300"
                  >
                    Actual cash in drawer
                  </label>
                  <input
                    id="actual-cash"
                    type="number"
                    step="any"
                    min={0}
                    value={actual}
                    placeholder={formatMoney(current.summary.expectedCash)}
                    onChange={(e) => {
                      setActual(e.target.value);
                      if (error) setError('');
                    }}
                    className="h-12 w-full border border-white/10 bg-[#07080d] px-4 font-mono text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!validActual || close.isPending}
                  className="h-12 border border-rose-500/50 bg-rose-500/20 px-6 text-base font-semibold text-rose-200 transition-colors hover:bg-rose-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {close.isPending ? 'Closing...' : 'Close Shift'}
                </button>

                {validActual && (
                  <span
                    className={`pb-2.5 font-mono text-base font-semibold tabular-nums ${diffColor(diff)}`}
                  >
                    Difference: {diff > 0 ? '+' : ''}
                    {formatMoney(diff)}
                  </span>
                )}
              </form>
            </>
          )}

          {error && (
            <div className="border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-base text-rose-300">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-base text-rose-300">
          Failed to load shifts. Check your connection or refresh the page.
        </div>
      )}

      {/* Shift Reports Table */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white">Shift Reports</h2>

        <div className="overflow-x-auto border border-white/10 bg-[#0b0e16]">
          <table className="w-full min-w-[1040px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-sm font-semibold text-slate-300">
                <th className="px-5 py-4">Cashier</th>
                <th className="px-5 py-4">Opened</th>
                <th className="px-5 py-4">Closed</th>
                <th className="px-5 py-4 text-right">Opening</th>
                <th className="px-5 py-4 text-right">Cash</th>
                <th className="px-5 py-4 text-right">Card</th>
                <th className="px-5 py-4 text-right">Other</th>
                <th className="px-5 py-4 text-right">Discounts</th>
                <th className="px-5 py-4 text-right">Expected</th>
                <th className="px-5 py-4 text-right">Actual</th>
                <th className="px-5 py-4 text-right">Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-base">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 11 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-5 w-20 bg-white/[0.06]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : visible.length > 0 ? (
                visible.map((s) => {
                  const rowDiff = roundMoney(s.summary.difference);
                  return (
                    <tr
                      key={s.id}
                      className="transition-colors hover:bg-cyan-500/[0.04]"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-white">
                        {userName(s.cashierId)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-sm tabular-nums text-slate-400">
                        {new Date(s.openedAt).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-sm tabular-nums text-slate-400">
                        {s.closedAt ? (
                          new Date(s.closedAt).toLocaleString()
                        ) : (
                          <span className="font-sans text-base font-semibold text-emerald-400">
                            Open
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-mono tabular-nums text-slate-200">
                        {formatMoney(s.openingCash)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-mono tabular-nums text-slate-200">
                        {formatMoney(s.summary.cash)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-mono tabular-nums text-slate-200">
                        {formatMoney(s.summary.card)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-mono tabular-nums text-slate-200">
                        {formatMoney(
                          s.summary.bankTransfer + s.summary.other
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-mono tabular-nums text-slate-400">
                        {formatMoney(s.summary.discounts)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-mono font-semibold tabular-nums text-cyan-300">
                        {formatMoney(s.summary.expectedCash)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-mono tabular-nums text-slate-200">
                        {s.actualCash != null ? formatMoney(s.actualCash) : '-'}
                      </td>
                      <td
                        className={`whitespace-nowrap px-5 py-4 text-right font-mono font-semibold tabular-nums ${
                          s.closedAt ? diffColor(rowDiff) : 'text-slate-500'
                        }`}
                      >
                        {s.closedAt
                          ? `${rowDiff > 0 ? '+' : ''}${formatMoney(rowDiff)}`
                          : '-'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={11}
                    className="px-5 py-10 text-center text-base text-slate-500"
                  >
                    No shifts yet
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