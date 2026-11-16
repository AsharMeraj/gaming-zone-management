'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { getSettings, updateSettings } from '@/lib/api/settings';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const [form, setForm] = useState({
    businessName: '',
    currency: '',
    receiptFooter: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        businessName: data.businessName ?? '',
        currency: data.currency ?? '',
        receiptFooter: data.receiptFooter ?? '',
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      updateSettings({
        businessName: form.businessName.trim(),
        currency: form.currency.trim(),
        receiptFooter: form.receiptFooter.trim(),
      }),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const set = (k: keyof typeof form, v: string) => {
    if (saved) setSaved(false);
    if (save.isError) save.reset();
    setForm((f) => ({ ...f, [k]: v }));
  };

  const valid = Boolean(form.businessName.trim() && form.currency.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || save.isPending) return;
    save.mutate();
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-wide text-white">
          Settings
        </h1>

        <Link
          href="/settings/users"
          className="inline-flex items-center gap-2 border border-white/10 bg-[#0b0e16] px-4 py-2.5 text-base font-medium text-cyan-300 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white"
        >
          <span>Manage Users</span>
          <ArrowUpRight size={18} />
        </Link>
      </div>

      {/* Fetch Error */}
      {isError && (
        <div className="border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-base text-rose-300">
          Failed to load settings. Check your connection or refresh the page.
        </div>
      )}

      {/* Business Settings Form */}
      {isLoading ? (
        <div className="flex max-w-2xl flex-col gap-5 border border-white/10 bg-[#0b0e16] p-6">
          <div className="h-6 w-32 animate-pulse bg-white/[0.06]" />
          <div className="h-12 w-full animate-pulse bg-white/[0.06]" />
          <div className="h-12 w-44 animate-pulse bg-white/[0.06]" />
          <div className="h-12 w-full animate-pulse bg-white/[0.06]" />
          <div className="h-11 w-28 animate-pulse bg-white/[0.06]" />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex max-w-2xl flex-col gap-5 border border-white/10 bg-[#0b0e16] p-6"
        >
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">Business</h2>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="business-name"
              className="text-sm font-medium text-slate-300"
            >
              Business name *
            </label>
            <input
              id="business-name"
              required
              value={form.businessName}
              onChange={(e) => set('businessName', e.target.value)}
              placeholder="e.g. CyberZone Gaming Lounge"
              className="h-12 w-full border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="business-currency"
              className="text-sm font-medium text-slate-300"
            >
              Currency *
            </label>
            <input
              id="business-currency"
              required
              value={form.currency}
              onChange={(e) => set('currency', e.target.value)}
              placeholder="PKR"
              className="h-12 w-44 border border-white/10 bg-[#07080d] px-4 font-mono text-base text-slate-100 placeholder:font-sans placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="receipt-footer"
              className="text-sm font-medium text-slate-300"
            >
              Receipt footer (optional)
            </label>
            <input
              id="receipt-footer"
              value={form.receiptFooter}
              onChange={(e) => set('receiptFooter', e.target.value)}
              placeholder="e.g. Thank you for playing with us!"
              className="h-12 w-full border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
            />
          </div>

          {save.isError && (
            <div className="border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-base text-rose-300">
              {save.error instanceof Error
                ? save.error.message
                : 'Failed to save settings.'}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={!valid || save.isPending}
              className="border border-cyan-400/50 bg-cyan-500/20 px-6 py-2.5 text-base font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {save.isPending ? 'Saving...' : 'Save'}
            </button>

            {saved && (
              <span className="text-base font-medium text-emerald-400">
                Saved
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}