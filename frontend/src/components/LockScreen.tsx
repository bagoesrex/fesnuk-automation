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
    <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100 relative overflow-hidden select-none">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-xl mb-4">
            <BrandLogo size={42} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Fesnuk Auto-Poster</h1>
          <p className="text-xs text-zinc-400 mt-1 flex items-center justify-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            Protected Dashboard & Automation Engine
          </p>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 transition"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg shadow-blue-600/20 active:scale-[0.99]"
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

        <p className="text-center text-[11px] text-zinc-500 mt-6">
          Set <code className="text-zinc-400">ADMIN_PASSWORD</code> in your VPS backend <code className="text-zinc-400">.env</code> to manage access.
        </p>
      </div>
    </div>
  );
}
