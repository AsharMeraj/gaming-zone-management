'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { createRoom, getRooms, updateRoom } from '@/lib/api/rooms';

const formatMoney = (val: number) => {
  const n = Math.round((val + Number.EPSILON) * 100) / 100;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

const empty = {
  name: '',
  category: '',
  capacity: '',
  hourlyRate: '',
  description: '',
};

export default function RoomsPage() {
  const qc = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);

  const {
    data: rooms = [],
    isLoading,
    isError,
  } = useQuery({ queryKey: ['rooms'], queryFn: getRooms });

  const [editing, setEditing] = useState<string | null>(null); // 'new' | room id
  const [form, setForm] = useState(empty);

  const refresh = () => qc.invalidateQueries({ queryKey: ['rooms'] });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        capacity: Number(form.capacity),
        hourlyRate:
          form.hourlyRate.trim() !== '' ? Number(form.hourlyRate) : undefined,
        description: form.description.trim() || undefined,
      };
      if (editing === 'new') await createRoom(payload);
      else await updateRoom(editing!, payload);
    },
    onSuccess: () => {
      refresh();
      setEditing(null);
      setForm(empty);
    },
  });

  const toggle = useMutation({
    mutationFn: (r: { id: string; active: boolean }) =>
      updateRoom(r.id, { active: !r.active }),
    onSuccess: refresh,
  });

  const set = (k: keyof typeof empty, v: string) => {
    if (save.isError) save.reset();
    setForm((f) => ({ ...f, [k]: v }));
  };

  const openNew = () => {
    save.reset();
    toggle.reset();
    setForm(empty);
    setEditing('new');
  };

  const openEdit = (r: (typeof rooms)[number]) => {
    save.reset();
    toggle.reset();
    setForm({
      name: r.name,
      category: r.category,
      capacity: String(r.capacity),
      hourlyRate: r.hourlyRate != null ? String(r.hourlyRate) : '',
      description: r.description ?? '',
    });
    setEditing(r.id);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const closeForm = () => {
    save.reset();
    setEditing(null);
    setForm(empty);
  };

  const valid = Boolean(
    form.name.trim() &&
      form.category.trim() &&
      Number(form.capacity) > 0 &&
      (form.hourlyRate.trim() === '' || Number(form.hourlyRate) >= 0)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || save.isPending) return;
    save.mutate();
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-wide text-white">Rooms</h1>

        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 border border-cyan-400/50 bg-cyan-500/20 px-5 py-2.5 text-base font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/30 hover:text-white"
        >
          <Plus size={18} />
          <span>Add Room</span>
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
              {editing === 'new' ? 'New Room' : 'Edit Room'}
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
                htmlFor="room-name"
                className="text-sm font-medium text-slate-300"
              >
                Name *
              </label>
              <input
                id="room-name"
                autoFocus
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. VIP Lounge 1"
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="room-category"
                className="text-sm font-medium text-slate-300"
              >
                Category *
              </label>
              <input
                id="room-category"
                required
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                placeholder="e.g. VIP Room, Console Room"
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="room-capacity"
                className="text-sm font-medium text-slate-300"
              >
                Capacity *
              </label>
              <input
                id="room-capacity"
                type="number"
                required
                min={1}
                value={form.capacity}
                onChange={(e) => set('capacity', e.target.value)}
                placeholder="e.g. 6"
                className="h-12 border border-white/10 bg-[#07080d] px-4 font-mono text-base text-slate-100 placeholder:font-sans placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="room-rate"
                className="text-sm font-medium text-slate-300"
              >
                Hourly rate override (optional)
              </label>
              <input
                id="room-rate"
                type="number"
                step="any"
                min={0}
                value={form.hourlyRate}
                onChange={(e) => set('hourlyRate', e.target.value)}
                placeholder="Default"
                className="h-12 border border-white/10 bg-[#07080d] px-4 font-mono text-base text-slate-100 placeholder:font-sans placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <label
                htmlFor="room-description"
                className="text-sm font-medium text-slate-300"
              >
                Description (optional)
              </label>
              <input
                id="room-description"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Room setup, seating, or amenities"
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>
          </div>

          {save.isError && (
            <div className="border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-base text-rose-300">
              {save.error instanceof Error
                ? save.error.message
                : 'Failed to save room.'}
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

      {/* Errors */}
      {isError && (
        <div className="border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-base text-rose-300">
          Failed to load rooms. Check your connection or refresh the page.
        </div>
      )}

      {toggle.isError && (
        <div className="border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-base text-rose-300">
          {toggle.error instanceof Error
            ? toggle.error.message
            : 'Failed to update room status.'}
        </div>
      )}

      {/* Rooms Table */}
      <div className="w-full overflow-x-auto border border-white/10 bg-[#0b0e16]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-sm font-semibold text-slate-300">
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4">Capacity</th>
              <th className="px-5 py-4">Rate</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-base">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-5 w-24 bg-white/[0.06]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rooms.length > 0 ? (
              rooms.map((r) => (
                <tr
                  key={r.id}
                  className={`transition-colors ${
                    editing === r.id
                      ? 'bg-cyan-500/[0.08]'
                      : 'hover:bg-cyan-500/[0.04]'
                  } ${r.active ? '' : 'opacity-60'}`}
                >
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="font-semibold text-white">{r.name}</span>
                    {r.description && (
                      <p className="mt-0.5 max-w-xs truncate text-sm text-slate-400">
                        {r.description}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-300">
                    {r.category}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-mono tabular-nums text-slate-200">
                    {r.capacity}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-mono tabular-nums text-slate-200">
                    {r.hourlyRate != null ? (
                      formatMoney(r.hourlyRate)
                    ) : (
                      <span className="font-sans text-slate-400">Default</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span
                      className={`font-semibold ${
                        r.active ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {r.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={toggle.isPending}
                        onClick={() => toggle.mutate(r)}
                        className="border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {r.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-base text-slate-500"
                >
                  No rooms found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}