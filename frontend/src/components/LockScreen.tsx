import { useState } from 'react';
import { LockKey, ShieldCheck, ArrowRight, SpinnerGap } from '@phosphor-icons/react';
import { BrandLogo } from './BrandLogo.tsx';
import { authService } from '../services/auth.ts';

interface LockScreenProps {
  onSuccess: () => void;
}

export function LockScreen({ onSuccess }: LockScreenProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your admin password');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authService.login(password);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col items-center justify-center p-4 sm:p-6 text-zinc-900 relative overflow-hidden select-none">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white border border-zinc-200/80 shadow-md mb-4">
            <BrandLogo size={42} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950">Fesnuk Auto-Poster</h1>
          <p className="text-xs text-zinc-500 mt-1.5 flex items-center justify-center gap-1.5">
            <ShieldCheck size={15} weight="bold" className="text-emerald-600" />
            Protected Dashboard & Automation Engine
          </p>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-7 shadow-xl shadow-zinc-200/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5">
                <LockKey size={14} className="text-zinc-400" />
                Master Admin Password
              </label>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-base sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:opacity-50 transition"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-sm active:scale-[0.99] cursor-pointer"
            >
              {loading ? (
                <>
                  <SpinnerGap size={15} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Unlock Dashboard
                  <ArrowRight size={14} weight="bold" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
