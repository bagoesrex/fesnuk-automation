import { useState } from 'react';
import { CloudSlash, ArrowsClockwise, WarningCircle, TerminalWindow } from '@phosphor-icons/react';
import { BrandLogo } from './BrandLogo.tsx';
import { API_BASE_URL } from '../services/api.ts';

interface ServerOfflineScreenProps {
  error?: string;
  onRetry: () => Promise<void>;
}

export function ServerOfflineScreen({ error, onRetry }: ServerOfflineScreenProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col items-center justify-center p-4 sm:p-6 text-zinc-900 select-none relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand & Status Icon */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-md mb-4">
            <BrandLogo size={42} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950">Backend Server Offline</h1>
          <p className="text-xs text-zinc-500 mt-1.5 max-w-sm mx-auto">
            The frontend dashboard cannot establish a network connection to your automation backend.
          </p>
        </div>

        {/* Offline Diagnostic Card */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xl shadow-zinc-200/50 space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <CloudSlash size={20} weight="bold" className="shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-900">Connection Failed</p>
              <p className="text-[11px] text-rose-700 leading-relaxed font-mono break-all">
                {error || 'Failed to fetch / network unreachable'}
              </p>
            </div>
          </div>

          {/* Configured Target */}
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-semibold uppercase tracking-wider">
              <TerminalWindow size={13} />
              <span>Target Endpoint</span>
            </div>
            <p className="font-mono text-zinc-800 text-[11px] truncate bg-white px-2.5 py-1.5 rounded-lg border border-zinc-200/60">
              {API_BASE_URL}
            </p>
          </div>

          {/* Diagnostics Guidance */}
          <div className="space-y-2 text-xs text-zinc-600 pt-1">
            <p className="font-semibold text-zinc-800 flex items-center gap-1.5">
              <WarningCircle size={14} className="text-amber-500" />
              Troubleshooting Steps:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-500 pl-1">
              <li>Ensure backend is running (<code className="text-zinc-700">pm2 status</code> or <code className="text-zinc-700">bun run start</code>)</li>
              <li>Verify VPS port (3001) or Nginx reverse proxy SSL is accessible</li>
              <li>Check that <code className="text-zinc-700">CORS_ORIGIN</code> on your backend allows this dashboard URL</li>
            </ul>
          </div>

          {/* Retry Button */}
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-sm active:scale-[0.99] cursor-pointer"
          >
            <ArrowsClockwise size={15} weight="bold" className={retrying ? 'animate-spin' : ''} />
            <span>{retrying ? 'Connecting to Server...' : 'Retry Connection'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
