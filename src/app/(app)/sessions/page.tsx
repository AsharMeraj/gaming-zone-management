'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, History, Pause, Play, Plus, X } from 'lucide-react';
import {
  endSession,
  extendSession,
  getSessions,
  pauseSession,
  resumeSession,
  startSession,
} from '@/lib/api/sessions';
import { getStations } from '@/lib/api/stations';
import { getRooms } from '@/lib/api/rooms';
import { getCustomers } from '@/lib/api/customers';
import { getPricing } from '@/lib/api/pricing';
import { getShifts } from '@/lib/api/shifts';
import { resolveHourlyRate } from '@/lib/pricing';
import {
  calcAmount,
  elapsedMs,
  formatDuration,
  remainingMs,
} from '@/lib/session';
import { useNow } from '@/lib/useNow';
import { useAuth } from '@/store/auth';

const roundMoney = (val: number) =>
  Math.round((val + Number.EPSILON) * 100) / 100;

const formatMoney = (val: number | null | undefined) => {
  const n = roundMoney(val ?? 0);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

const emptyForm = {
  customerId: '',
  stationId: '',
  type: 'open' as SessionType,
  planId: '',
  notes: '',
};

export default function SessionsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const now = useNow();
  const user = useAuth((s) => s.user);

  const startFormRef = useRef<HTMLFormElement>(null);
  const endFormRef = useRef<HTMLFormElement>(null);

  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    isError: sessionsError,
  } = useQuery({ queryKey: ['sessions'], queryFn: getSessions });

  const { data: stations = [], isLoading: stationsLoading } = useQuery({
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

  const { data: pricing } = useQuery({
    queryKey: ['pricing'],
    queryFn: getPricing,
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: getShifts,
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>(
    'amount'
  );
  const [discountValue, setDiscountValue] = useState('');

  const hasShift = useMemo(
    () => shifts.some((s) => s.cashierId === user?.id && !s.closedAt),
    [shifts, user?.id]
  );

  const active = useMemo(
    () => sessions.filter((s) => s.status !== 'completed'),
    [sessions]
  );

  const free = useMemo(
    () => stations.filter((s) => s.active && s.status === 'available'),
    [stations]
  );

  const stationMap = useMemo(() => {
    const map = new Map<string, (typeof stations)[number]>();
    for (const s of stations) map.set(s.id, s);
    return map;
  }, [stations]);

  const roomMap = useMemo(() => {
    const map = new Map<string, (typeof rooms)[number]>();
    for (const r of rooms) map.set(r.id, r);
    return map;
  }, [rooms]);

  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of customers) map.set(c.id, c.name);
    return map;
  }, [customers]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['sessions'] });
    qc.invalidateQueries({ queryKey: ['stations'] });
    qc.invalidateQueries({ queryKey: ['shifts'] });
  };

  const start = useMutation({
    mutationFn: () =>
      startSession({
        customerId: form.customerId || null,
        stationId: form.stationId,
        type: form.type,
        planId: form.type === 'fixed' ? form.planId : undefined,
        notes: form.notes.trim() || undefined,
      }),
    onSuccess: () => {
      refresh();
      setForm(emptyForm);
      setShowForm(false);
    },
  });

  const pause = useMutation({
    mutationFn: pauseSession,
    onSuccess: refresh,
  });

  const resume = useMutation({
    mutationFn: resumeSession,
    onSuccess: refresh,
  });

  const extend = useMutation({
    mutationFn: (v: { id: string; minutes: number }) =>
      extendSession(v.id, v.minutes),
    onSuccess: refresh,
  });

  const end = useMutation({
    mutationFn: (v: { id: string; discount: number }) =>
      endSession(v.id, v.discount),
    onSuccess: (_, v) => {
      refresh();
      setEndingId(null);
      setDiscountValue('');
      router.push(`/billing/${v.id}`);
    },
  });

  const clearErrors = () => {
    if (start.isError) start.reset();
    if (pause.isError) pause.reset();
    if (resume.isError) resume.reset();
    if (extend.isError) extend.reset();
    if (end.isError) end.reset();
  };

  const openStartForm = () => {
    clearErrors();
    setEndingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const closeStartForm = () => {
    start.reset();
    setShowForm(false);
    setForm(emptyForm);
  };

  const openEndPanel = (id: string) => {
    clearErrors();
    setShowForm(false);
    setDiscountType('amount');
    setDiscountValue('');
    setEndingId(id);
    requestAnimationFrame(() => {
      endFormRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  };

  const closeEndPanel = () => {
    end.reset();
    setEndingId(null);
    setDiscountValue('');
  };

  const roomName = (id?: string) => (id ? roomMap.get(id)?.name ?? '-' : '-');
  const customerName = (id: string | null) =>
    id ? customerMap.get(id) ?? '-' : 'Walk-in';

  const formStation = stationMap.get(form.stationId);
  const formRate =
    formStation && pricing
      ? resolveHourlyRate(
          formStation,
          roomMap.get(formStation.roomId),
          pricing
        )
      : null;

  const formValid = Boolean(
    form.stationId && (form.type === 'open' || form.planId)
  );

  const ending = useMemo(
    () => (endingId ? sessions.find((s) => s.id === endingId) : undefined),
    [endingId, sessions]
  );

  const endAmount = ending ? roundMoney(calcAmount(ending, now)) : 0;
  const parsedDiscount = Number(discountValue || 0);
  const rawDiscount =
    Number.isFinite(parsedDiscount) && parsedDiscount > 0
      ? discountType === 'percent'
        ? roundMoney((endAmount * parsedDiscount) / 100)
        : roundMoney(parsedDiscount)
      : 0;
  const endDiscount = Math.min(Math.max(0, rawDiscount), endAmount);
  const endTotal = roundMoney(Math.max(0, endAmount - endDiscount));

  const handleStartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasShift || !formValid || start.isPending) return;
    start.mutate();
  };

  const handleEndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ending || end.isPending) return;
    end.mutate({ id: ending.id, discount: endDiscount });
  };

  const actionError =
    pause.error ?? resume.error ?? extend.error ?? (ending ? null : end.error);

  const isLoading = sessionsLoading || stationsLoading;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-wide text-white">
          Sessions
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/sessions/history"
            className="inline-flex items-center gap-2 border border-white/10 bg-[#0b0e16] px-4 py-2.5 text-base font-medium text-slate-200 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white"
          >
            <History size={18} />
            <span>History</span>
          </Link>

          <button
            type="button"
            disabled={!hasShift || shiftsLoading}
            onClick={openStartForm}
            className="inline-flex items-center gap-2 border border-cyan-400/50 bg-cyan-500/20 px-5 py-2.5 text-base font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={18} />
            <span>Start Session</span>
          </button>
        </div>
      </div>

      {/* No Shift Warning */}
      {!shiftsLoading && !hasShift && (
        <div className="flex flex-wrap items-center gap-3 border border-amber-400/40 bg-amber-500/10 px-5 py-4 text-base text-amber-200">
          <AlertTriangle size={20} className="shrink-0 text-amber-400" />
          <span>
            You need an open shift to start sessions.{' '}
            <Link
              href="/shifts"
              className="font-semibold text-white underline decoration-amber-400/70 underline-offset-4 hover:text-amber-200"
            >
              Start a shift
            </Link>
          </span>
        </div>
      )}

      {/* Fetch & Action Errors */}
      {sessionsError && (
        <div className="border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-base text-rose-300">
          Failed to load sessions. Check your connection or refresh the page.
        </div>
      )}

      {actionError && (
        <div className="border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-base text-rose-300">
          {actionError instanceof Error
            ? actionError.message
            : 'Failed to update session.'}
        </div>
      )}

      {/* Start Session Form */}
      {showForm && (
        <form
          ref={startFormRef}
          onSubmit={handleStartSubmit}
          className="flex flex-col gap-5 border border-cyan-400/40 bg-[#0b0e16] p-6"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">New Session</h2>
            <button
              type="button"
              aria-label="Close form"
              onClick={closeStartForm}
              className="border border-white/10 bg-[#07080d] p-2 text-slate-400 transition-colors hover:border-white/25 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="session-customer"
                className="text-sm font-medium text-slate-300"
              >
                Customer
              </label>
              <select
                id="session-customer"
                value={form.customerId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, customerId: e.target.value }))
                }
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
              >
                <option value="">Walk-in</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="session-station"
                className="text-sm font-medium text-slate-300"
              >
                Station *
              </label>
              <select
                id="session-station"
                required
                value={form.stationId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stationId: e.target.value }))
                }
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
              >
                <option value="">
                  {free.length === 0
                    ? 'No available stations'
                    : 'Select station'}
                </option>
                {free.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {roomName(s.roomId)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="session-type"
                className="text-sm font-medium text-slate-300"
              >
                Session type *
              </label>
              <select
                id="session-type"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as SessionType,
                    planId: '',
                  }))
                }
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
              >
                <option value="open">Open (pay for actual time)</option>
                <option value="fixed">Fixed duration</option>
              </select>
            </div>

            {form.type === 'fixed' ? (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="session-plan"
                  className="text-sm font-medium text-slate-300"
                >
                  Plan *
                </label>
                <select
                  id="session-plan"
                  required
                  value={form.planId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, planId: e.target.value }))
                  }
                  className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
                >
                  <option value="">Select plan</option>
                  {pricing?.plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {formatMoney(p.price)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-300">Rate</span>
                <div className="flex h-12 items-center border border-white/10 bg-[#07080d] px-4 font-mono text-base text-slate-300">
                  {formRate != null ? (
                    <span>{formatMoney(formRate)} / hour</span>
                  ) : (
                    <span className="font-sans text-slate-500">
                      Select a station
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:col-span-2">
              <label
                htmlFor="session-notes"
                className="text-sm font-medium text-slate-300"
              >
                Notes (optional)
              </label>
              <input
                id="session-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Controllers, remarks, or special requests"
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>
          </div>

          {start.isError && (
            <div className="border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-base text-rose-300">
              {start.error instanceof Error
                ? start.error.message
                : 'Failed to start session.'}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={!hasShift || !formValid || start.isPending}
              className="border border-cyan-400/50 bg-cyan-500/20 px-6 py-2.5 text-base font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              {start.isPending ? 'Starting...' : 'Start'}
            </button>

            <button
              type="button"
              onClick={closeStartForm}
              className="border border-white/10 bg-[#07080d] px-6 py-2.5 text-base font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* End Session Confirmation Panel */}
      {ending && (
        <form
          ref={endFormRef}
          onSubmit={handleEndSubmit}
          className="flex flex-col gap-5 border border-rose-500/50 bg-[#0b0e16] p-6"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">
                End Session: {stationMap.get(ending.stationId)?.name ?? '-'}
              </h2>
              <p className="mt-0.5 text-sm text-slate-400">
                {customerName(ending.customerId)} ·{' '}
                {roomName(stationMap.get(ending.stationId)?.roomId)}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close end session panel"
              onClick={closeEndPanel}
              className="border border-white/10 bg-[#07080d] p-2 text-slate-400 transition-colors hover:border-white/25 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5 border border-white/10 bg-[#07080d] p-4">
              <span className="text-sm font-medium text-slate-400">
                Duration
              </span>
              <span className="font-mono text-2xl font-bold tabular-nums text-white">
                {formatDuration(elapsedMs(ending, now))}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 border border-white/10 bg-[#07080d] p-4">
              <span className="text-sm font-medium text-slate-400">Amount</span>
              <span className="font-mono text-2xl font-bold tabular-nums text-white">
                {formatMoney(endAmount)}
              </span>
            </div>

            <div className="flex flex-col gap-2 border border-white/10 bg-[#07080d] p-4">
              <label
                htmlFor="session-discount"
                className="text-sm font-medium text-slate-400"
              >
                Discount
              </label>
              <div className="flex gap-2">
                <input
                  id="session-discount"
                  type="number"
                  step="any"
                  min={0}
                  value={discountValue}
                  placeholder="0"
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="h-11 w-full min-w-0 border border-white/10 bg-[#0b0e16] px-3 font-mono text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
                />
                <select
                  aria-label="Discount type"
                  value={discountType}
                  onChange={(e) =>
                    setDiscountType(e.target.value as 'amount' | 'percent')
                  }
                  className="h-11 shrink-0 border border-white/10 bg-[#0b0e16] px-3 text-sm font-medium text-slate-200 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
                >
                  <option value="amount">Fixed</option>
                  <option value="percent">%</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 border border-emerald-500/30 bg-[#07080d] p-4">
              <span className="text-sm font-medium text-slate-400">Total</span>
              <span className="font-mono text-2xl font-bold tabular-nums text-emerald-400">
                {formatMoney(endTotal)}
              </span>
            </div>
          </div>

          {end.isError && (
            <div className="border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-base text-rose-300">
              {end.error instanceof Error
                ? end.error.message
                : 'Failed to end session.'}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={end.isPending}
              className="border border-rose-500/50 bg-rose-500/20 px-6 py-2.5 text-base font-semibold text-rose-200 transition-colors hover:bg-rose-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {end.isPending ? 'Ending...' : 'Confirm End'}
            </button>

            <button
              type="button"
              onClick={closeEndPanel}
              className="border border-white/10 bg-[#07080d] px-6 py-2.5 text-base font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Active Sessions Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse border border-white/10 bg-[#0b0e16]"
            />
          ))
        ) : active.length > 0 ? (
          active.map((s) => {
            const st = stationMap.get(s.stationId);
            const rem = remainingMs(s, now);
            const isOvertime = rem !== null && rem < 0;
            const isEnding = endingId === s.id;
            const isPaused = s.status === 'paused';

            return (
              <div
                key={s.id}
                className={`flex flex-col justify-between gap-4 border bg-[#0b0e16] p-5 transition-colors ${
                  isEnding
                    ? 'border-rose-500/60 bg-rose-500/[0.04]'
                    : isOvertime
                      ? 'border-rose-500/40'
                      : 'border-white/10 hover:border-cyan-400/30'
                }`}
              >
                {/* Top Info */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold text-white">
                        {st?.name ?? 'Station'}
                      </h3>
                      <p className="truncate text-sm text-slate-400">
                        {roomName(st?.roomId)}
                      </p>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${
                        isPaused
                          ? 'border-amber-400/30 bg-amber-500/10 text-amber-300'
                          : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 ${
                          isPaused ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                      />
                      {s.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium text-slate-200">
                      {customerName(s.customerId)}
                    </span>
                    {s.notes && (
                      <span className="max-w-[160px] truncate text-xs text-slate-500">
                        {s.notes}
                      </span>
                    )}
                  </div>

                  {/* Live Timer & Running Charge */}
                  <div className="flex flex-col gap-2 border border-white/10 bg-[#07080d] p-4">
                    <span className="font-mono text-3xl font-bold tabular-nums tracking-tight text-white">
                      {formatDuration(elapsedMs(s, now))}
                    </span>

                    <div className="flex items-center justify-between gap-2 text-sm">
                      {rem !== null ? (
                        <span
                          className={`font-mono font-medium tabular-nums ${
                            isOvertime ? 'text-rose-400' : 'text-slate-400'
                          }`}
                        >
                          {isOvertime ? 'Overtime ' : 'Left '}
                          {formatDuration(rem)}
                        </span>
                      ) : (
                        <span className="font-mono text-slate-400">
                          Open · {formatMoney(s.rate)}/hr
                        </span>
                      )}

                      <span className="font-mono text-base font-bold tabular-nums text-cyan-300">
                        {formatMoney(calcAmount(s, now))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {s.status === 'active' ? (
                    <button
                      type="button"
                      disabled={pause.isPending}
                      onClick={() => {
                        clearErrors();
                        pause.mutate(s.id);
                      }}
                      className="inline-flex items-center gap-1.5 border border-white/10 bg-white/[0.02] px-3.5 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-amber-400/50 hover:bg-amber-500/10 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Pause size={14} />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={resume.isPending}
                      onClick={() => {
                        clearErrors();
                        resume.mutate(s.id);
                      }}
                      className="inline-flex items-center gap-1.5 border border-white/10 bg-white/[0.02] px-3.5 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Play size={14} />
                      <span>Resume</span>
                    </button>
                  )}

                  {s.type === 'fixed' && (
                    <>
                      <button
                        type="button"
                        disabled={extend.isPending}
                        onClick={() => {
                          clearErrors();
                          extend.mutate({ id: s.id, minutes: 30 });
                        }}
                        className="border border-white/10 bg-white/[0.02] px-3 py-2 font-mono text-sm font-medium text-slate-200 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +30m
                      </button>
                      <button
                        type="button"
                        disabled={extend.isPending}
                        onClick={() => {
                          clearErrors();
                          extend.mutate({ id: s.id, minutes: 60 });
                        }}
                        className="border border-white/10 bg-white/[0.02] px-3 py-2 font-mono text-sm font-medium text-slate-200 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +1h
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => openEndPanel(s.id)}
                    className="ml-auto border border-rose-500/50 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/30 hover:text-white"
                  >
                    End
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full border border-white/10 bg-[#0b0e16] px-5 py-12 text-center text-base text-slate-500">
            No active sessions
          </div>
        )}
      </div>
    </div>
  );
}