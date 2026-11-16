'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Gamepad2, LogIn } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { AUTHENTICATION } from '@/lib/config';

export default function LoginPage() {
  const login = useAuth((s) => s.login);
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!AUTHENTICATION) router.replace('/dashboard');
  }, [router]);

  const valid = Boolean(username.trim() && password);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;

    const result = login(username.trim(), password);
    if (result === 'ok') {
      router.replace('/dashboard');
    } else if (result === 'deactivated') {
      setError('Your account has been deactivated by the owner');
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07080d] p-4 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Ambient neon depth & subtle grid */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 bg-cyan-500/[0.08] blur-[120px]" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 bg-fuchsia-600/[0.07] blur-[130px]" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
      </div>

      <form
        onSubmit={onSubmit}
        className="relative z-10 flex w-full max-w-md flex-col gap-6 border border-white/10 bg-[#0b0e16]/95 p-8 backdrop-blur-xl"
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3.5 border-b border-white/10 pb-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 via-indigo-500/15 to-fuchsia-500/20 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Gamepad2 size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
              Gaming Zone
            </span>
            <h1 className="text-2xl font-bold tracking-wide text-white">
              Sign In
            </h1>
          </div>
        </div>

        {/* Inputs */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="login-username"
              className="text-sm font-medium text-slate-300"
            >
              Username
            </label>
            <input
              id="login-username"
              autoFocus
              required
              autoComplete="username"
              placeholder="Enter username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError('');
              }}
              className="h-12 w-full border border-white/10 bg-[#07080d] px-4 font-mono text-base text-slate-100 placeholder:font-sans placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="login-password"
              className="text-sm font-medium text-slate-300"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                className="h-12 w-full border border-white/10 bg-[#07080d] pl-4 pr-12 text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute cursor-pointer right-0 top-0 flex h-12 w-12 items-center justify-center text-slate-500 transition-colors hover:text-slate-800"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-base text-rose-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!valid}
          className="inline-flex h-12 w-full items-center justify-center gap-2 border border-cyan-400/50 bg-cyan-500/20 px-6 text-base font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <LogIn size={18} />
          <span>Sign In</span>
        </button>

        <p className="border-t border-white/10 pt-4 text-center font-mono text-sm text-slate-400">
          owner/owner123 · manager/manager123 · cashier/cashier123
        </p>
      </form>
    </div>
  );
}