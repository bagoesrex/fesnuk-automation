import { useState } from 'react';
import { useAsync } from '../hooks/useAsync.ts';
import { logsService } from '../services/logs.ts';
import { useAccount } from '../context/AccountContext.tsx';
import { Badge } from '../components/Badge.tsx';
import { NoAccountsCard } from '../components/NoAccountsCard.tsx';
import { ArrowsClockwise, CaretLeft, CaretRight } from '@phosphor-icons/react';

export default function Logs() {
  const { selectedAccountId, accounts, loading: loadingAccounts } = useAccount();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, loading, refetch } = useAsync(
    () => logsService.list({ status: statusFilter || undefined, page, accountId: selectedAccountId ?? undefined }),
    [page, statusFilter, selectedAccountId]
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200/80">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Logs</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Audit history of automated post executions and delivery diagnostics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input cursor-pointer py-1.5 text-xs font-medium flex-1 sm:flex-none sm:w-auto"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="SKIPPED">Skipped</option>
          </select>
          <button
            onClick={() => {
              void refetch();
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200/80 rounded-xl hover:bg-zinc-50 shadow-xs transition-colors cursor-pointer"
          >
            <ArrowsClockwise size={14} weight="bold" />
            Refresh
          </button>
        </div>
      </div>

      {!loadingAccounts && accounts.length === 0 && <NoAccountsCard />}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-zinc-50/75 text-zinc-500 text-[11px] font-semibold uppercase tracking-wider border-b border-zinc-100">
            <tr>
              <th className="px-5 py-3.5 text-left">Time</th>
              <th className="px-5 py-3.5 text-left">Group</th>
              <th className="px-5 py-3.5 text-left">Schedule</th>
              <th className="px-5 py-3.5 text-left">Status</th>
              <th className="px-5 py-3.5 text-left">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-zinc-400">
                  <div className="inline-flex items-center gap-2 text-sm text-zinc-500">
                    <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Loading logs...
                  </div>
                </td>
              </tr>
            ) : data?.logs.map((log) => (
              <tr key={log.id} className="hover:bg-zinc-50/60 transition-colors">
                <td className="px-5 py-3.5 text-xs text-zinc-500 font-mono whitespace-nowrap">
                  {new Date(log.postedAt).toLocaleString()}
                </td>
                <td className="px-5 py-3.5 font-medium text-zinc-900">
                  {log.group?.name ?? <span className="text-zinc-400 italic">Deleted Group</span>}
                </td>
                <td className="px-5 py-3.5 text-zinc-600">
                  {log.schedule?.name ?? <span className="text-zinc-400 italic">Manual / Deleted</span>}
                </td>
                <td className="px-5 py-3.5">
                  <Badge
                    label={log.status}
                    variant={
                      log.status === 'SUCCESS' ? 'green' : log.status === 'FAILED' ? 'red' : 'yellow'
                    }
                  />
                </td>
                <td className="px-5 py-3.5 text-rose-600 text-xs font-mono max-w-xs truncate">
                  {log.error ? (
                    <span title={log.error}>{log.error}</span>
                  ) : (
                    <span className="text-zinc-300">—</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && !data?.logs.length && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-zinc-400">
                  <p className="text-sm font-medium">No logs yet</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Executed runs will log their delivery timestamps and outcomes here.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 px-2">
          <span>{data.total} total executions recorded</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 font-medium border border-zinc-200 rounded-xl bg-white hover:bg-zinc-50 disabled:opacity-40 transition-colors"
            >
              <CaretLeft size={13} weight="bold" />
              Prev
            </button>
            <span className="px-2 font-medium text-zinc-700">
              Page {page} of {data.totalPages}
            </span>
            <button
              disabled={page === data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 font-medium border border-zinc-200 rounded-xl bg-white hover:bg-zinc-50 disabled:opacity-40 transition-colors"
            >
              Next
              <CaretRight size={13} weight="bold" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
