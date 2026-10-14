import { useAsync } from '../hooks/useAsync.ts';
import { logsService } from '../services/logs.ts';

export default function Dashboard() {
  const { data: stats, loading } = useAsync(() => logsService.stats(), []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {loading ? (
        <p className="text-gray-500">Loading stats...</p>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Posts" value={stats.totalPosts} />
          <StatCard label="Success Rate" value={`${stats.successRate}%`} />
          <StatCard label="Active Schedules" value={stats.activeSchedules} />
          <StatCard label="Active Groups" value={stats.totalGroups} />
        </div>
      ) : null}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-3">Quick Start</h2>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>Go to <strong>Session</strong> and set up your Facebook account</li>
          <li>Go to <strong>Groups</strong> and add your target Facebook groups</li>
          <li>Go to <strong>Posts</strong> and create post content</li>
          <li>Go to <strong>Schedules</strong> and create a cron schedule</li>
          <li>Monitor results in <strong>Logs</strong></li>
        </ol>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
