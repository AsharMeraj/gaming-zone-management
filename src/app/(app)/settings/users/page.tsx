'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { createUser, getUsers, toggleUser, updateUser } from '@/lib/api/users';

const empty = { name: '', username: '', password: '', role: 'cashier' as Role };

export default function UsersPage() {
  const qc = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);

  const {
    data: users = [],
    isLoading,
    isError,
  } = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const [editing, setEditing] = useState<string | null>(null); // 'new' | user id
  const [form, setForm] = useState(empty);

  const refresh = () => qc.invalidateQueries({ queryKey: ['users'] });

  const save = useMutation({
    mutationFn: async () => {
      if (editing === 'new') {
        await createUser({
          name: form.name.trim(),
          username: form.username.trim(),
          password: form.password,
          role: form.role,
        });
      } else {
        await updateUser(editing!, {
          name: form.name.trim(),
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        });
      }
    },
    onSuccess: () => {
      refresh();
      setEditing(null);
      setForm(empty);
    },
  });

  const toggle = useMutation({
    mutationFn: toggleUser,
    onSuccess: refresh,
  });

  const set = <K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) => {
    if (save.isError) save.reset();
    setForm((f) => ({ ...f, [k]: v }));
  };

  const openNew = () => {
    save.reset();
    toggle.reset();
    setForm(empty);
    setEditing('new');
  };

  const openEdit = (u: (typeof users)[number]) => {
    save.reset();
    toggle.reset();
    setForm({
      name: u.name,
      username: u.username,
      password: '',
      role: u.role,
    });
    setEditing(u.id);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const closeForm = () => {
    save.reset();
    setEditing(null);
    setForm(empty);
  };

  const isNew = editing === 'new';
  const valid = Boolean(
    form.name.trim() &&
      (isNew
        ? form.username.trim() && form.password.length >= 6
        : form.password.length === 0 || form.password.length >= 6)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || save.isPending) return;
    save.mutate();
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <Link
            href="/settings"
            className="inline-flex w-fit items-center gap-2 text-base font-medium text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={18} />
            <span>Back to Settings</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-wide text-white">Users</h1>
        </div>

        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 border border-cyan-400/50 bg-cyan-500/20 px-5 py-2.5 text-base font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/30 hover:text-white"
        >
          <Plus size={18} />
          <span>Add User</span>
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
              {isNew ? 'New User' : 'Edit User'}
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
                htmlFor="user-name"
                className="text-sm font-medium text-slate-300"
              >
                Full Name *
              </label>
              <input
                id="user-name"
                autoFocus
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Hamza Khan"
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="user-role"
                className="text-sm font-medium text-slate-300"
              >
                Role *
              </label>
              <select
                id="user-role"
                value={form.role}
                onChange={(e) => set('role', e.target.value as Role)}
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 focus:border-cyan-400/60 focus:outline-none [color-scheme:dark]"
              >
                <option value="manager">Manager</option>
                <option value="cashier">Cashier</option>
              </select>
            </div>

            {isNew && (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="user-username"
                  className="text-sm font-medium text-slate-300"
                >
                  Username *
                </label>
                <input
                  id="user-username"
                  required
                  autoComplete="off"
                  value={form.username}
                  onChange={(e) => set('username', e.target.value)}
                  placeholder="e.g. hamza"
                  className="h-12 border border-white/10 bg-[#07080d] px-4 font-mono text-base text-slate-100 placeholder:font-sans placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label
                htmlFor="user-password"
                className="text-sm font-medium text-slate-300"
              >
                {isNew ? 'Password *' : 'New password (optional)'}
              </label>
              <input
                id="user-password"
                type="password"
                autoComplete="new-password"
                required={isNew}
                minLength={isNew ? 6 : undefined}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder={
                  isNew
                    ? 'Minimum 6 characters'
                    : 'Leave empty to keep current'
                }
                className="h-12 border border-white/10 bg-[#07080d] px-4 text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>
          </div>

          {save.isError && (
            <div className="border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-base text-rose-300">
              {save.error instanceof Error
                ? save.error.message
                : 'Failed to save user.'}
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
          Failed to load users. Check your connection or refresh the page.
        </div>
      )}

      {toggle.isError && (
        <div className="border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-base text-rose-300">
          {toggle.error instanceof Error
            ? toggle.error.message
            : 'Failed to update user status.'}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto border border-white/10 bg-[#0b0e16]">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-sm font-semibold text-slate-300">
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Username</th>
              <th className="px-5 py-4">Role</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-base">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-5 w-28 bg-white/[0.06]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length > 0 ? (
              users.map((u) => (
                <tr
                  key={u.id}
                  className={`transition-colors ${
                    editing === u.id
                      ? 'bg-cyan-500/[0.08]'
                      : 'hover:bg-cyan-500/[0.04]'
                  } ${u.active ? '' : 'opacity-60'}`}
                >
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-white">
                    {u.name}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-sm text-slate-300">
                    {u.username}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 capitalize text-slate-200">
                    {u.role}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span
                      className={`font-semibold ${
                        u.active ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {u.role !== 'owner' && (
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate(u.id)}
                          className="border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {u.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-base text-slate-500"
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}