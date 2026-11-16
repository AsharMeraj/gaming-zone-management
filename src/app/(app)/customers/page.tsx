'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, X } from 'lucide-react';
import {
  createCustomer,
  getCustomers,
  updateCustomer,
} from '@/lib/api/customers';

const empty = { name: '', phone: '', email: '', notes: '' };

export default function CustomersPage() {
  const qc = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);

  const {
    data: customers = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const [editing, setEditing] = useState<string | null>(null); // 'new' | customer id
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');

  const set = (k: keyof typeof empty, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (editing === 'new') await createCustomer(payload);
      else await updateCustomer(editing!, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setEditing(null);
      setForm(empty);
    },
  });

  const openNew = () => {
    save.reset();
    setForm(empty);
    setEditing('new');
  };

  const openEdit = (c: (typeof customers)[number]) => {
    save.reset();
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email ?? '',
      notes: c.notes ?? '',
    });
    setEditing(c.id);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const closeForm = () => {
    save.reset();
    setEditing(null);
    setForm(empty);
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [customers, search]);

  const valid = Boolean(form.name.trim() && form.phone.trim());

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
          Customers
        </h1>

        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 border border-cyan-400/50 bg-cyan-500/20 px-5 py-2.5 text-base font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/30 hover:text-white"
        >
          <UserPlus size={18} />
          <span>Register Customer</span>
        </button>
      </div>

      {/* Create / Edit Form */}
      {editing && (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 border border-cyan-400/40 bg-[#0b0e16] p-6"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">
              {editing === 'new' ? 'New Customer' : 'Edit Customer'}
            </h2>
            <button
              type="button"
              aria-label="Close form"
              onClick={closeForm}
              className="border border-white/10 bg-[#07080d] p-2 text-slate-400 transition-colors hover:border-white/25 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="cust-name"
                className="text-sm font-medium text-slate-300"
              >
                Full Name *
              </label>
              <input
                id="cust-name"
                autoFocus
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Ali Raza"
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="cust-phone"
                className="text-sm font-medium text-slate-300"
              >
                Phone *
              </label>
              <input
                id="cust-phone"
                required
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="e.g. 0300-1234567"
                className="h-12 border border-white/10 bg-[#07080d] px-4 font-mono text-base text-slate-100 placeholder:font-sans placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="cust-email"
                className="text-sm font-medium text-slate-300"
              >
                Email (optional)
              </label>
              <input
                id="cust-email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="player@example.com"
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="cust-notes"
                className="text-sm font-medium text-slate-300"
              >
                Notes (optional)
              </label>
              <input
                id="cust-notes"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Preferred rig or remarks"
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>
          </div>

          {save.isError && (
            <div className="border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-base text-rose-300">
              {save.error instanceof Error
                ? save.error.message
                : 'Failed to save customer.'}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={!valid || save.isPending}
              className="border border-cyan-400/50 bg-cyan-500/20 px-6 py-2.5 text-base font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              {save.isPending ? 'Saving...' : 'Save'}
            </button>

            <button
              type="button"
              onClick={closeForm}
              className="border border-white/10 bg-[#07080d] px-6 py-2.5 text-base font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or ID"
            className="h-12 w-full border border-white/10 bg-[#0b0e16] pl-11 pr-4 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
          />
        </div>

        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="h-12 border border-white/10 bg-[#0b0e16] px-4 text-base font-medium text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Fetch Error */}
      {isError && (
        <div className="border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-base text-rose-300">
          Failed to load customers. Check your connection or refresh the page.
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-white/10 bg-[#0b0e16]">
        <table className="w-full min-w-[680px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-sm font-semibold text-slate-300">
              <th className="px-5 py-4">ID</th>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Phone</th>
              <th className="px-5 py-4">Registered</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-base">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-5 w-28 bg-white/[0.06]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visible.length > 0 ? (
              visible.map((c) => (
                <tr
                  key={c.id}
                  className={`transition-colors ${
                    editing === c.id
                      ? 'bg-cyan-500/[0.08]'
                      : 'hover:bg-cyan-500/[0.04]'
                  }`}
                >
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-sm text-slate-400">
                    {c.id}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <Link
                      href={`/customers/${c.id}`}
                      className="font-semibold text-cyan-300 transition-colors hover:text-white"
                    >
                      {c.name}
                    </Link>
                    {c.notes && (
                      <p className="mt-0.5 max-w-xs truncate text-sm text-slate-400">
                        {c.notes}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-mono tabular-nums text-slate-200">
                    {c.phone}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-sm tabular-nums text-slate-400">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white"
                      >
                        Edit
                      </button>
                      <Link
                        href={`/customers/${c.id}`}
                        className="border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-sm font-medium text-cyan-300 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white"
                      >
                        Profile
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-base text-slate-500"
                >
                  No customers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}