'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import {
  createPlan,
  deletePlan,
  getPricing,
  updateDefaults,
  updatePlan,
} from '@/lib/api/pricing';

const formatMoney = (val: number | null | undefined) => {
  const n = Math.round(((val ?? 0) + Number.EPSILON) * 100) / 100;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

const emptyPlan = { name: '', minutes: '', price: '' };

export default function PricingPage() {
  const qc = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);

  const {
    data: pricing,
    isLoading,
    isError,
  } = useQuery({ queryKey: ['pricing'], queryFn: getPricing });

  const refresh = () => qc.invalidateQueries({ queryKey: ['pricing'] });

  const [hourly, setHourly] = useState('');
  const [half, setHalf] = useState('');
  const [defaultsSaved, setDefaultsSaved] = useState(false);

  const [editing, setEditing] = useState<string | null>(null); // 'new' | plan id
  const [plan, setPlan] = useState(emptyPlan);

  useEffect(() => {
    if (pricing) {
      setHourly(String(pricing.defaultHourly));
      setHalf(String(pricing.defaultHalfHour));
    }
  }, [pricing]);

  const saveDefaults = useMutation({
    mutationFn: () => updateDefaults(Number(hourly), Number(half)),
    onSuccess: () => {
      setDefaultsSaved(true);
      refresh();
    },
  });

  const savePlan = useMutation({
    mutationFn: async () => {
      const payload = {
        name: plan.name.trim(),
        minutes: Number(plan.minutes),
        price: Number(plan.price),
      };
      if (editing === 'new') await createPlan(payload);
      else await updatePlan(editing!, payload);
    },
    onSuccess: () => {
      refresh();
      setEditing(null);
      setPlan(emptyPlan);
    },
  });

  const remove = useMutation({
    mutationFn: deletePlan,
    onSuccess: (_, deletedId) => {
      refresh();
      if (editing === deletedId) {
        setEditing(null);
        setPlan(emptyPlan);
      }
    },
  });

  const handleHourlyChange = (v: string) => {
    if (defaultsSaved) setDefaultsSaved(false);
    if (saveDefaults.isError) saveDefaults.reset();
    setHourly(v);
  };

  const handleHalfChange = (v: string) => {
    if (defaultsSaved) setDefaultsSaved(false);
    if (saveDefaults.isError) saveDefaults.reset();
    setHalf(v);
  };

  const setPlanField = (k: keyof typeof emptyPlan, v: string) => {
    if (savePlan.isError) savePlan.reset();
    setPlan((p) => ({ ...p, [k]: v }));
  };

  const openNewPlan = () => {
    savePlan.reset();
    remove.reset();
    setPlan(emptyPlan);
    setEditing('new');
  };

  const openEditPlan = (p: NonNullable<typeof pricing>['plans'][number]) => {
    savePlan.reset();
    remove.reset();
    setPlan({
      name: p.name,
      minutes: String(p.minutes),
      price: String(p.price),
    });
    setEditing(p.id);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const closePlanForm = () => {
    savePlan.reset();
    setEditing(null);
    setPlan(emptyPlan);
  };

  const defaultsValid = Boolean(
    hourly.trim() !== '' &&
      Number(hourly) > 0 &&
      half.trim() !== '' &&
      Number(half) > 0
  );

  const planValid = Boolean(
    plan.name.trim() && Number(plan.minutes) > 0 && Number(plan.price) > 0
  );

  const handleDefaultsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!defaultsValid || saveDefaults.isPending) return;
    saveDefaults.mutate();
  };

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planValid || savePlan.isPending) return;
    savePlan.mutate();
  };

  const plans = pricing?.plans ?? [];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <h1 className="text-3xl font-bold tracking-wide text-white">Pricing</h1>

      {/* Fetch Error */}
      {isError && (
        <div className="border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-base text-rose-300">
          Failed to load pricing. Check your connection or refresh the page.
        </div>
      )}

      {/* Default Rates Card */}
      {isLoading ? (
        <div className="flex flex-col gap-5 border border-white/10 bg-[#0b0e16] p-6">
          <div className="h-6 w-40 animate-pulse bg-white/[0.06]" />
          <div className="flex flex-wrap gap-4">
            <div className="h-12 w-48 animate-pulse bg-white/[0.06]" />
            <div className="h-12 w-48 animate-pulse bg-white/[0.06]" />
            <div className="h-12 w-28 animate-pulse bg-white/[0.06]" />
          </div>
          <div className="h-5 w-96 max-w-full animate-pulse bg-white/[0.06]" />
        </div>
      ) : (
        <form
          onSubmit={handleDefaultsSubmit}
          className="flex flex-col gap-5 border border-white/10 bg-[#0b0e16] p-6"
        >
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">Default Rates</h2>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex w-full flex-col gap-2 sm:w-48">
              <label
                htmlFor="default-hourly"
                className="text-sm font-medium text-slate-300"
              >
                Hourly rate *
              </label>
              <input
                id="default-hourly"
                type="number"
                step="any"
                min={0}
                required
                value={hourly}
                onChange={(e) => handleHourlyChange(e.target.value)}
                placeholder="0"
                className="h-12 w-full border border-white/10 bg-[#07080d] px-4 font-mono text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-48">
              <label
                htmlFor="default-half-hour"
                className="text-sm font-medium text-slate-300"
              >
                Half-hour rate *
              </label>
              <input
                id="default-half-hour"
                type="number"
                step="any"
                min={0}
                required
                value={half}
                onChange={(e) => handleHalfChange(e.target.value)}
                placeholder="0"
                className="h-12 w-full border border-white/10 bg-[#07080d] px-4 font-mono text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={!defaultsValid || saveDefaults.isPending}
              className="h-12 border border-cyan-400/50 bg-cyan-500/20 px-6 text-base font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saveDefaults.isPending ? 'Saving...' : 'Save'}
            </button>

            {defaultsSaved && (
              <span className="pb-2.5 text-base font-medium text-emerald-400">
                Saved
              </span>
            )}
          </div>

          {saveDefaults.isError && (
            <div className="border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-base text-rose-300">
              {saveDefaults.error instanceof Error
                ? saveDefaults.error.message
                : 'Failed to save default rates.'}
            </div>
          )}

          <p className="border-t border-white/10 pt-4 text-sm text-slate-400">
            Rate order: station override, then room override, then these
            defaults. Set overrides on the Stations and Rooms pages.
          </p>
        </form>
      )}

      {/* Fixed-Duration Plans Section */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-white">
            Fixed-Duration Plans
          </h2>

          <button
            type="button"
            onClick={openNewPlan}
            className="inline-flex items-center gap-2 border border-cyan-400/50 bg-cyan-500/20 px-5 py-2.5 text-base font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/30 hover:text-white"
          >
            <Plus size={18} />
            <span>Add Plan</span>
          </button>
        </div>

        {/* Create / Edit Plan Form */}
        {editing && (
          <form
            ref={formRef}
            onSubmit={handlePlanSubmit}
            className="flex flex-col gap-5 border border-cyan-400/40 bg-[#0b0e16] p-6"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white">
                {editing === 'new' ? 'New Plan' : 'Edit Plan'}
              </h3>
              <button
                type="button"
                aria-label="Close form"
                onClick={closePlanForm}
                className="border border-white/10 bg-[#07080d] p-2 text-slate-400 transition-colors hover:border-white/25 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="plan-name"
                  className="text-sm font-medium text-slate-300"
                >
                  Name *
                </label>
                <input
                  id="plan-name"
                  autoFocus
                  required
                  value={plan.name}
                  onChange={(e) => setPlanField('name', e.target.value)}
                  placeholder="e.g. 2 Hours"
                  className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="plan-minutes"
                  className="text-sm font-medium text-slate-300"
                >
                  Minutes *
                </label>
                <input
                  id="plan-minutes"
                  type="number"
                  min={1}
                  required
                  value={plan.minutes}
                  onChange={(e) => setPlanField('minutes', e.target.value)}
                  placeholder="e.g. 120"
                  className="h-12 border border-white/10 bg-[#07080d] px-4 font-mono text-base text-slate-100 placeholder:font-sans placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="plan-price"
                  className="text-sm font-medium text-slate-300"
                >
                  Price *
                </label>
                <input
                  id="plan-price"
                  type="number"
                  step="any"
                  min={0}
                  required
                  value={plan.price}
                  onChange={(e) => setPlanField('price', e.target.value)}
                  placeholder="e.g. 500"
                  className="h-12 border border-white/10 bg-[#07080d] px-4 font-mono text-base text-slate-100 placeholder:font-sans placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
                />
              </div>
            </div>

            {savePlan.isError && (
              <div className="border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-base text-rose-300">
                {savePlan.error instanceof Error
                  ? savePlan.error.message
                  : 'Failed to save plan.'}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={!planValid || savePlan.isPending}
                className="border border-cyan-400/50 bg-cyan-500/20 px-6 py-2.5 text-base font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                {savePlan.isPending ? 'Saving...' : 'Save'}
              </button>

              <button
                type="button"
                onClick={closePlanForm}
                className="border border-white/10 bg-[#07080d] px-6 py-2.5 text-base font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Delete Error */}
        {remove.isError && (
          <div className="border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-base text-rose-300">
            {remove.error instanceof Error
              ? remove.error.message
              : 'Failed to delete plan.'}
          </div>
        )}

        {/* Plans Table */}
        <div className="w-full overflow-x-auto border border-white/10 bg-[#0b0e16]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-sm font-semibold text-slate-300">
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Duration</th>
                <th className="px-5 py-4">Price</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-base">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-5 w-24 bg-white/[0.06]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : plans.length > 0 ? (
                plans.map((p) => (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      editing === p.id
                        ? 'bg-cyan-500/[0.08]'
                        : 'hover:bg-cyan-500/[0.04]'
                    }`}
                  >
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-white">
                      {p.name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-mono tabular-nums text-slate-300">
                      {p.minutes} min
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-mono font-semibold tabular-nums text-cyan-300">
                      {formatMoney(p.price)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => openEditPlan(p)}
                          className="border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(p.id)}
                          className="border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-sm font-medium text-rose-300 transition-colors hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-base text-slate-500"
                  >
                    No fixed-duration plans yet
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