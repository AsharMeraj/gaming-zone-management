'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { getInvoice, recordPayment } from '@/lib/api/billing';
import { calcAmount, elapsedMs, formatDuration } from '@/lib/session';
import { userName } from '@/lib/users';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
];

const methodLabel = (m: PaymentMethod) =>
  METHODS.find((x) => x.value === m)?.label ?? m;

const statusLabel: Record<string, string> = {
  paid: 'PAID IN FULL',
  partial: 'PARTIALLY PAID',
  unpaid: 'UNPAID',
};

const roundMoney = (val: number) =>
  Math.round((val + Number.EPSILON) * 100) / 100;

const formatMoney = (val: number | null | undefined) => {
  const n = roundMoney(val ?? 0);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const {
    data: inv,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id),
  });

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [error, setError] = useState('');

  const pay = useMutation({
    mutationFn: (payAmount: number) => recordPayment(id, payAmount, method),
    onSuccess: () => {
      setAmount('');
      setError('');
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['session-history'] });
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5 border border-white/10 bg-[#0b0e16] p-6">
        <div className="h-6 w-44 animate-pulse bg-white/[0.06]" />
        <div className="h-5 w-full animate-pulse bg-white/[0.06]" />
        <div className="h-5 w-3/4 animate-pulse bg-white/[0.06]" />
        <div className="h-32 w-full animate-pulse bg-white/[0.06]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-4 border border-rose-500/40 bg-rose-500/10 p-6">
        <p className="text-lg font-semibold text-rose-300">
          Failed to load invoice.
        </p>
        <Link
          href="/billing"
          className="inline-flex items-center gap-2 border border-white/10 bg-[#07080d] px-4 py-2 text-base font-medium text-slate-200 hover:border-cyan-400/50 hover:text-white"
        >
          <ArrowLeft size={18} />
          <span>Back to Billing</span>
        </Link>
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="flex flex-col items-start gap-4 border border-white/10 bg-[#0b0e16] p-6">
        <p className="text-lg text-slate-400">Invoice not found.</p>
        <Link
          href="/billing"
          className="inline-flex items-center gap-2 border border-white/10 bg-[#07080d] px-4 py-2 text-base font-medium text-cyan-300 hover:border-cyan-400/50 hover:text-white"
        >
          <ArrowLeft size={18} />
          <span>Back to Billing</span>
        </Link>
      </div>
    );
  }

  const {
    session: s,
    payments,
    total,
    paid,
    balance,
    status,
    customer,
    station,
    room,
    settings,
  } = inv;

  const cur = settings.currency;
  const cleanTotal = roundMoney(total);
  const cleanPaid = roundMoney(paid);
  const cleanBalance = roundMoney(balance);
  const cleanDiscount = roundMoney(s.discount ?? 0);
  const subtotal = roundMoney(cleanTotal + cleanDiscount);
  const locationLabel =
    [station?.name, room?.name].filter(Boolean).join(' · ') || '-';

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = amount.trim() === '' ? cleanBalance : Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid payment amount greater than 0.');
      return;
    }
    if (roundMoney(parsed) > cleanBalance) {
      setError(
        `Amount cannot exceed remaining balance (${cur} ${formatMoney(cleanBalance)}).`
      );
      return;
    }

    pay.mutate(roundMoney(parsed));
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          href="/billing"
          className="inline-flex items-center gap-2 text-base font-medium text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={18} />
          <span>Back to Billing</span>
        </Link>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 border border-cyan-400/50 bg-cyan-500/20 px-5 py-2.5 text-base font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/30 hover:text-white"
        >
          <Printer size={18} />
          <span>Print Receipt</span>
        </button>
      </div>

      {/* Main Split Grid */}
      <div
        className={
          cleanBalance > 0
            ? 'mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-8 lg:grid-cols-12 print:block print:max-w-md'
            : 'mx-auto w-full max-w-lg'
        }
      >
        {/* Thermal Receipt Sheet */}
        <div
          className={`flex w-full flex-col gap-5 border border-white/20 bg-white p-7 font-mono text-sm text-black print:border-none print:p-0 print:text-xs ${
            cleanBalance > 0 ? 'lg:col-span-7' : ''
          }`}
        >
          {/* Business Header */}
          <div className="flex flex-col items-center gap-1 border-b border-dashed border-neutral-400 pb-4 text-center">
            <span className="font-sans text-xl font-bold text-black">
              {settings.businessName}
            </span>
            <span className="text-xs uppercase tracking-widest text-neutral-600">
              Official Session Receipt
            </span>
          </div>

          {/* Session Metadata */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between gap-4">
              <span className="text-neutral-600">Invoice</span>
              <span className="font-bold">{s.invoiceNo ?? s.id}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-neutral-600">Date</span>
              <span className="tabular-nums">
                {new Date(s.endedAt ?? s.startedAt).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-neutral-600">Customer</span>
              <span className="font-semibold">
                {customer?.name ?? 'Walk-in'}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-neutral-600">Station</span>
              <span>{locationLabel}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-neutral-600">Duration</span>
              <span className="tabular-nums">
                {formatDuration(elapsedMs(s))}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-neutral-600">Cashier</span>
              <span>{userName(s.cashierId)}</span>
            </div>
          </div>

          {/* Line Items */}
          <div className="flex flex-col gap-2 border-y border-dashed border-neutral-400 py-4">
            {s.type === 'fixed' ? (
              <>
                <div className="flex justify-between gap-4">
                  <span>{s.planName}</span>
                  <span className="tabular-nums">
                    {cur} {formatMoney(s.planPrice)}
                  </span>
                </div>
                {s.extensionAmount > 0 && (
                  <div className="flex justify-between gap-4">
                    <span>Extension</span>
                    <span className="tabular-nums">
                      {cur} {formatMoney(s.extensionAmount)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-between gap-4">
                <span>
                  Open session ({cur} {formatMoney(s.rate)}/hr)
                </span>
                <span className="tabular-nums">
                  {cur} {formatMoney(calcAmount(s))}
                </span>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-neutral-600">Subtotal</span>
              <span className="tabular-nums">
                {cur} {formatMoney(subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Discount</span>
              <span className="tabular-nums">
                {cleanDiscount > 0
                  ? `-${cur} ${formatMoney(cleanDiscount)}`
                  : `${cur} 0`}
              </span>
            </div>
            <div className="mt-1 flex justify-between border-t border-neutral-300 pt-2.5 font-sans text-base font-bold">
              <span>Total ({cur})</span>
              <span className="font-mono tabular-nums">
                {formatMoney(cleanTotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Paid</span>
              <span className="tabular-nums">
                {cur} {formatMoney(cleanPaid)}
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Balance Due</span>
              <span className="tabular-nums">
                {cur} {formatMoney(cleanBalance)}
              </span>
            </div>

            {/* Stamp */}
            <div className="pt-3 text-center">
              <span
                className={`inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-widest ${
                  status === 'paid'
                    ? 'border-2 border-black text-black'
                    : 'border border-dashed border-black text-black'
                }`}
              >
                {statusLabel[status] ?? status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-dashed border-neutral-400 pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                Payment Transactions
              </span>
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between gap-2 text-xs"
                >
                  <span className="text-neutral-700">
                    {new Date(p.createdAt).toLocaleString()} ·{' '}
                    {methodLabel(p.method)}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {cur} {formatMoney(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {settings.receiptFooter && (
            <p className="border-t border-dashed border-neutral-400 pt-4 text-center text-xs text-neutral-600">
              {settings.receiptFooter}
            </p>
          )}
        </div>

        {/* Settle Balance Panel */}
        {cleanBalance > 0 && (
          <form
            onSubmit={handlePaymentSubmit}
            className="flex flex-col gap-5 border border-white/10 bg-[#0b0e16] p-6 lg:col-span-5 print:hidden"
          >
            <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-white">Record Payment</h2>
              <p className="font-mono text-base font-semibold text-rose-400">
                Due: {cur} {formatMoney(cleanBalance)}
              </p>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="pay-amount"
                    className="text-sm font-medium text-slate-300"
                  >
                    Amount ({cur})
                  </label>
                  {amount !== '' && (
                    <button
                      type="button"
                      onClick={() => setAmount('')}
                      className="font-mono text-sm text-cyan-400 hover:text-cyan-300"
                    >
                      Use full ({formatMoney(cleanBalance)})
                    </button>
                  )}
                </div>
                <input
                  id="pay-amount"
                  type="number"
                  step="any"
                  min={0.01}
                  max={cleanBalance}
                  value={amount}
                  placeholder={formatMoney(cleanBalance)}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (error) setError('');
                  }}
                  className="h-12 w-full border border-white/10 bg-[#07080d] px-4 font-mono text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="pay-method"
                  className="text-sm font-medium text-slate-300"
                >
                  Payment Method
                </label>
                <select
                  id="pay-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className="h-12 w-full border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-base text-rose-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={pay.isPending}
              className="h-12 w-full border border-emerald-400/50 bg-emerald-500/20 px-6 text-base font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pay.isPending ? 'Recording...' : 'Record Payment'}
            </button>

            <p className="text-sm text-slate-400">
              Leave amount blank to settle the full balance.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}