import { useAsync } from '../hooks/useAsync.ts';
import { logsService } from '../services/logs.ts';
import {
  PaperPlaneTilt,
  CheckCircle,
  ClockCountdown,
  UsersThree,
  Cpu,
  ShieldCheck,
  Database,
  ArrowRight,
  type Icon,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { data: stats, loading } = useAsync(() => logsService.stats(), []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200/80">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Real-time automation telemetry, schedule activity, and group health.
          </p>
        </div>
      </div>

      {/* Bento Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Posts"
          value={loading ? '—' : stats?.totalPosts ?? 0}
          icon={PaperPlaneTilt}
          accent="blue"
          sub="All-time executed posts"
        />
        <StatCard
          label="Success Rate"
          value={loading ? '—' : `${stats?.successRate ?? 0}%`}
          icon={CheckCircle}
          accent="emerald"
          sub="Delivery health index"
        />
        <StatCard
          label="Active Schedules"
          value={loading ? '—' : stats?.activeSchedules ?? 0}
          icon={ClockCountdown}
          accent="amber"
          sub="Running cron jobs"
        />
        <StatCard
          label="Active Groups"
          value={loading ? '—' : stats?.totalGroups ?? 0}
          icon={UsersThree}
          accent="violet"
          sub="Synced posting targets"
        />
      </div>

      {/* Grid: Quick Start & System Engine Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Start Guide (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
              <div>
                <h2 className="text-base font-bold text-zinc-950 tracking-tight">Quick Start</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Follow this sequence to initialize autonomous posting
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-zinc-100 rounded-md text-zinc-600">
                5 Steps
              </span>
            </div>

            <ol className="space-y-3 list-decimal list-inside text-sm text-zinc-600">
              <li className="p-3 rounded-xl bg-zinc-50/80 border border-zinc-100 hover:border-zinc-200 transition-colors">
                Go to <strong className="font-semibold text-zinc-900">Session</strong> and set up your Facebook account
              </li>
              <li className="p-3 rounded-xl bg-zinc-50/80 border border-zinc-100 hover:border-zinc-200 transition-colors">
                Go to <strong className="font-semibold text-zinc-900">Groups</strong> and add your target Facebook groups
              </li>
              <li className="p-3 rounded-xl bg-zinc-50/80 border border-zinc-100 hover:border-zinc-200 transition-colors">
                Go to <strong className="font-semibold text-zinc-900">Posts</strong> and create post content
              </li>
              <li className="p-3 rounded-xl bg-zinc-50/80 border border-zinc-100 hover:border-zinc-200 transition-colors">
                Go to <strong className="font-semibold text-zinc-900">Schedules</strong> and create a cron schedule
              </li>
              <li className="p-3 rounded-xl bg-zinc-50/80 border border-zinc-100 hover:border-zinc-200 transition-colors">
                Monitor results in <strong className="font-semibold text-zinc-900">Logs</strong>
              </li>
            </ol>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>Ready to post?</span>
            <Link
              to="/session"
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Start setup <ArrowRight size={13} weight="bold" />
            </Link>
          </div>
        </div>

        {/* Engine Specs & Security Telemetry (1 col) */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-950 tracking-tight mb-1">
              Engine Architecture
            </h2>
            <p className="text-xs text-zinc-500 mb-5">
              Built-in automation specifications
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50/70 border border-zinc-100">
                <ShieldCheck size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-zinc-900">Playwright Stealth</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Fingerprint masking & randomized anti-detection delays
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50/70 border border-zinc-100">
                <Cpu size={20} className="text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-zinc-900">Cron Daemon</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    node-cron registry synced with scheduled tasks
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50/70 border border-zinc-100">
                <Database size={20} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-zinc-900">Audit Trail</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Immutable PostLog audit records preserved on cascade
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Runtime: Bun 1.x</span>
            <span>Port: 3001</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: IconComponent,
  accent,
  sub,
}: {
  label: string;
  value: number | string;
  icon: Icon;
  accent: 'blue' | 'emerald' | 'amber' | 'violet';
  sub: string;
}) {
  const accentClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    violet: 'bg-purple-50 text-purple-600 border-purple-100',
  }[accent];

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        <div className={`p-2 rounded-xl border ${accentClasses}`}>
          <IconComponent size={18} weight="duotone" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-extrabold text-zinc-950 tracking-tight tabular-nums">
          {value}
        </p>
        <p className="text-[11px] text-zinc-400 mt-1">{sub}</p>
      </div>
    </div>
  );
}
