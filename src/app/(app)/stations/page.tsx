'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import {
  createStation,
  getStations,
  setStationStatus,
  updateStation,
} from '@/lib/api/stations';
import { getRooms } from '@/lib/api/rooms';
import { useAuth } from '@/store/auth';

const STATUSES: StationStatus[] = [
  'available',
  'occupied',
  'maintenance',
  'unavailable',
];

const statusColor: Record<StationStatus, string> = {
  available: 'text-emerald-400',
  occupied: 'text-rose-400',
  maintenance: 'text-amber-400',
  unavailable: 'text-slate-400',
};

const formatMoney = (val: number) => {
  const n = Math.round((val + Number.EPSILON) * 100) / 100;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

const empty = {
  name: '',
  number: '',
  roomId: '',
  platform: '',
  category: '',
  hourlyRate: '',
  notes: '',
};

export default function StationsPage() {
  const qc = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const role = useAuth((s) => s.user?.role);
  const canManage = role === 'owner' || role === 'manager';

  const {
    data: stations = [],
    isLoading,
    isError,
  } = useQuery({ queryKey: ['stations'], queryFn: getStations });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [roomFilter, setRoomFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const set = (k: keyof typeof empty, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const refresh = () => qc.invalidateQueries({ queryKey: ['stations'] });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        number: form.number.trim(),
        roomId: form.roomId,
        platform: form.platform.trim(),
        category: form.category.trim(),
        hourlyRate:
          form.hourlyRate.trim() !== '' ? Number(form.hourlyRate) : undefined,
        notes: form.notes.trim() || undefined,
      };
      if (editing === 'new') await createStation(payload);
      else await updateStation(editing!, payload);
    },
    onSuccess: () => {
      refresh();
      setEditing(null);
      setForm(empty);
    },
  });

  const changeStatus = useMutation({
    mutationFn: (v: { id: string; status: StationStatus }) =>
      setStationStatus(v.id, v.status),
    onSuccess: refresh,
  });

  const toggle = useMutation({
    mutationFn: (s: { id: string; active: boolean }) =>
      updateStation(s.id, { active: !s.active }),
    onSuccess: refresh,
  });

  const roomMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rooms) map.set(r.id, r.name);
    return map;
  }, [rooms]);

  const selectableRooms = useMemo(
    () => rooms.filter((r) => r.active || r.id === form.roomId),
    [rooms, form.roomId]
  );

  const openNew = () => {
    save.reset();
    const firstActiveRoom = rooms.find((r) => r.active)?.id ?? '';
    setForm({ ...empty, roomId: firstActiveRoom });
    setEditing('new');
  };

  const openEdit = (s: (typeof stations)[number]) => {
    save.reset();
    setForm({
      name: s.name,
      number: s.number ?? '',
      roomId: s.roomId,
      platform: s.platform,
      category: s.category,
      hourlyRate: s.hourlyRate != null ? String(s.hourlyRate) : '',
      notes: s.notes ?? '',
    });
    setEditing(s.id);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const closeForm = () => {
    save.reset();
    setEditing(null);
    setForm(empty);
  };

  const valid = Boolean(
    form.name.trim() &&
      form.roomId &&
      form.platform.trim() &&
      form.category.trim() &&
      (form.hourlyRate.trim() === '' || Number(form.hourlyRate) >= 0)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || save.isPending) return;
    save.mutate();
  };

  const visible = useMemo(
    () =>
      stations.filter(
        (s) =>
          (!roomFilter || s.roomId === roomFilter) &&
          (!statusFilter || s.status === statusFilter)
      ),
    [stations, roomFilter, statusFilter]
  );

  const hasFilters = Boolean(roomFilter || statusFilter);
  const actionError = changeStatus.error ?? toggle.error;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-wide text-white">
          Stations
        </h1>

        {canManage && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 border border-cyan-400/50 bg-cyan-500/20 px-5 py-2.5 text-base font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/30 hover:text-white"
          >
            <Plus size={18} />
            <span>Add Station</span>
          </button>
        )}
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
              {editing === 'new' ? 'New Station' : 'Edit Station'}
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

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="station-name"
                className="text-sm font-medium text-slate-300"
              >
                Name *
              </label>
              <input
                id="station-name"
                autoFocus
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. PC-05"
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="station-number"
                className="text-sm font-medium text-slate-300"
              >
                Number
              </label>
              <input
                id="station-number"
                value={form.number}
                onChange={(e) => set('number', e.target.value)}
                placeholder="e.g. 05"
                className="h-12 border border-white/10 bg-[#07080d] px-4 font-mono text-base text-slate-100 placeholder:font-sans placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="station-room"
                className="text-sm font-medium text-slate-300"
              >
                Room *
              </label>
              <select
                id="station-room"
                required
                value={form.roomId}
                onChange={(e) => set('roomId', e.target.value)}
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
              >
                {selectableRooms.length === 0 && (
                  <option value="">No active rooms</option>
                )}
                {selectableRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="station-platform"
                className="text-sm font-medium text-slate-300"
              >
                Platform *
              </label>
              <input
                id="station-platform"
                required
                value={form.platform}
                onChange={(e) => set('platform', e.target.value)}
                placeholder="e.g. PC, PS5"
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="station-category"
                className="text-sm font-medium text-slate-300"
              >
                Category *
              </label>
              <input
                id="station-category"
                required
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                placeholder="e.g. Standard, VIP"
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="station-rate"
                className="text-sm font-medium text-slate-300"
              >
                Hourly rate override (optional)
              </label>
              <input
                id="station-rate"
                type="number"
                step="any"
                min={0}
                value={form.hourlyRate}
                onChange={(e) => set('hourlyRate', e.target.value)}
                placeholder="Default"
                className="h-12 border border-white/10 bg-[#07080d] px-4 font-mono text-base text-slate-100 placeholder:font-sans placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
              <label
                htmlFor="station-notes"
                className="text-sm font-medium text-slate-300"
              >
                Notes (optional)
              </label>
              <input
                id="station-notes"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Hardware specs or remarks"
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>
          </div>

          {save.isError && (
            <div className="border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-base text-rose-300">
              {save.error instanceof Error
                ? save.error.message
                : 'Failed to save station.'}
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          className="h-12 border border-white/10 bg-[#0b0e16] px-4 text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
        >
          <option value="">All rooms</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-12 border border-white/10 bg-[#0b0e16] px-4 text-base capitalize text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setRoomFilter('');
              setStatusFilter('');
            }}
            className="h-12 border border-white/10 bg-[#0b0e16] px-4 text-base font-medium text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Errors */}
      {isError && (
        <div className="border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-base text-rose-300">
          Failed to load stations. Check your connection or refresh the page.
        </div>
      )}

      {actionError && (
        <div className="border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-base text-rose-300">
          {actionError instanceof Error
            ? actionError.message
            : 'Failed to update station.'}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-white/10 bg-[#0b0e16]">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-sm font-semibold text-slate-300">
              <th className="px-5 py-4">Station</th>
              <th className="px-5 py-4">Room</th>
              <th className="px-5 py-4">Platform</th>
              <th className="px-5 py-4">Rate</th>
              <th className="px-5 py-4">Status</th>
              {canManage && <th className="px-5 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-base">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: canManage ? 6 : 5 }).map((__, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-5 w-24 bg-white/[0.06]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visible.length > 0 ? (
              visible.map((s) => (
                <tr
                  key={s.id}
                  className={`transition-colors ${
                    editing === s.id
                      ? 'bg-cyan-500/[0.08]'
                      : 'hover:bg-cyan-500/[0.04]'
                  } ${s.active ? '' : 'opacity-50'}`}
                >
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="font-semibold text-white">{s.name}</span>
                    {s.notes && (
                      <p className="mt-0.5 max-w-xs truncate text-sm text-slate-400">
                        {s.notes}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-300">
                    {roomMap.get(s.roomId) ?? '-'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-200">
                    {s.platform}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-mono tabular-nums text-slate-200">
                    {s.hourlyRate != null ? (
                      formatMoney(s.hourlyRate)
                    ) : (
                      <span className="font-sans text-slate-400">Default</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <select
                      aria-label={`Status for ${s.name}`}
                      value={s.status}
                      disabled={!s.active || changeStatus.isPending}
                      onChange={(e) =>
                        changeStatus.mutate({
                          id: s.id,
                          status: e.target.value as StationStatus,
                        })
                      }
                      className={`h-10 border border-white/10 bg-[#07080d] px-3 text-sm font-semibold capitalize focus:border-cyan-400/60 focus:outline-none disabled:cursor-not-allowed [color-scheme:dark] ${statusColor[s.status]}`}
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>
                  {canManage && (
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate(s)}
                          className="border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {s.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={canManage ? 6 : 5}
                  className="px-5 py-10 text-center text-base text-slate-500"
                >
                  No stations found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}