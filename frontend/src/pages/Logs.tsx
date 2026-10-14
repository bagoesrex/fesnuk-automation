import { useState } from 'react';
import { useAsync } from '../hooks/useAsync.ts';
import { logsService } from '../services/logs.ts';
import { Badge } from '../components/Badge.tsx';

export default function Logs() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, loading, refetch } = useAsync(
    () => logsService.list({ status: statusFilter || undefined, page }),
    [page, statusFilter]
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Logs</h1>
        <div className="flex gap-2 items-center">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="SKIPPED">Skipped</option>
          </select>
          <button onClick={() => { void refetch(); }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            Refresh
          </button>
        </div>
      </div>

      {loading ? <p className="text-gray-500">Loading...</p> : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Group</th>
                  <th className="px-4 py-3 text-left">Schedule</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.postedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{log.group.name}</td>
                    <td className="px-4 py-3 text-gray-500">{log.schedule.name}</td>
                    <td className="px-4 py-3">
                      <Badge
                        label={log.status}
                        variant={log.status === 'SUCCESS' ? 'green' : log.status === 'FAILED' ? 'red' : 'yellow'}
                      />
                    </td>
                    <td className="px-4 py-3 text-red-500 text-xs max-w-xs truncate">{log.error ?? '—'}</td>
                  </tr>
                ))}
                {!data?.logs.length && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No logs yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{data.total} total entries</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40">← Prev</button>
                <span className="px-3 py-1.5">Page {page} of {data.totalPages}</span>
                <button disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
