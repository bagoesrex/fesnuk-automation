import { useState } from 'react';
import { useAsync } from '../hooks/useAsync.ts';
import { groupsService } from '../services/groups.ts';
import { accountsService } from '../services/accounts.ts';
import { Modal } from '../components/Modal.tsx';
import { Badge } from '../components/Badge.tsx';
import type { Group } from '../types/index.ts';
import {
  ArrowsClockwise,
  Plus,
  ArrowSquareOut,
  Trash,
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react';

export default function Groups() {
  const { data: groups, loading, refetch } = useAsync(() => groupsService.list(), []);
  const { data: accounts } = useAsync(() => accountsService.list(), []);

  const [showAdd, setShowAdd] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [form, setForm] = useState({ name: '', url: '' });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ added: number; skipped: number; total: number } | null>(null);
  const [syncAccountId, setSyncAccountId] = useState('');
  const [err, setErr] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      await groupsService.create(form);
      setShowAdd(false);
      setForm({ name: '', url: '' });
      await refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleSync(e: React.FormEvent) {
    e.preventDefault();
    if (!syncAccountId) { setErr('Select an account'); return; }
    setSyncing(true);
    setErr('');
    setSyncResult(null);
    try {
      const result = await groupsService.sync(syncAccountId);
      setSyncResult(result);
      await refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function toggleActive(g: Group) {
    await groupsService.update(g.id, { isActive: !g.isActive });
    await refetch();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this group?')) return;
    try {
      await groupsService.delete(id);
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
  }

  const activeAccounts = accounts?.filter((a) => a.isActive) ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200/80">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Groups</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Target Facebook groups for scheduled content distribution.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => { setShowSync(true); setSyncResult(null); setErr(''); }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
          >
            <ArrowsClockwise size={16} weight="bold" />
            Sync from Facebook
          </button>
          <button
            onClick={() => { setShowAdd(true); setErr(''); }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={16} weight="bold" />
            Add Manually
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[580px]">
          <thead className="bg-zinc-50/75 text-zinc-500 text-[11px] font-semibold uppercase tracking-wider border-b border-zinc-100">
            <tr>
              <th className="px-5 py-3.5 text-left">Name</th>
              <th className="px-5 py-3.5 text-left">Group ID</th>
              <th className="px-5 py-3.5 text-left">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-zinc-400">
                  <div className="inline-flex items-center gap-2 text-sm text-zinc-500">
                    <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Loading groups...
                  </div>
                </td>
              </tr>
            ) : groups?.map((g) => (
              <tr key={g.id} className="hover:bg-zinc-50/60 transition-colors">
                <td className="px-5 py-3.5 font-medium text-zinc-900">
                  <a
                    href={g.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors group"
                  >
                    <span>{g.name}</span>
                    <ArrowSquareOut size={13} className="text-zinc-400 group-hover:text-blue-600" />
                  </a>
                </td>
                <td className="px-5 py-3.5">
                  <code className="text-xs text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md font-mono">
                    {g.fbGroupId}
                  </code>
                </td>
                <td className="px-5 py-3.5">
                  <Badge
                    label={g.isActive ? 'Active' : 'Disabled'}
                    variant={g.isActive ? 'green' : 'gray'}
                    pulse={g.isActive}
                  />
                </td>
                <td className="px-5 py-3.5 text-right space-x-2">
                  <button
                    onClick={() => toggleActive(g)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                  >
                    {g.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors inline-flex items-center gap-1"
                  >
                    <Trash size={13} />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loading && !groups?.length && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-zinc-400">
                  <p className="text-sm">No groups yet</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Click <strong>Sync from Facebook</strong> to import your joined groups automatically.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Sync Modal */}
      {showSync && (
        <Modal title="Sync Groups from Facebook" onClose={() => setShowSync(false)}>
          <form onSubmit={(e) => { void handleSync(e); }} className="space-y-4">
            <p className="text-sm text-zinc-600 leading-relaxed">
              Opens a browser with your saved session and automatically imports all Facebook Groups you have joined.
              Groups already in the list will be skipped.
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider">
                Select Account
              </label>
              {activeAccounts.length === 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  <WarningCircle size={16} />
                  No active accounts found. Set up a session first.
                </div>
              ) : (
                <select
                  value={syncAccountId}
                  onChange={(e) => setSyncAccountId(e.target.value)}
                  className="input cursor-pointer"
                  required
                >
                  <option value="">Select account...</option>
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
            </div>

            {syncResult && (
              <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/80 p-4 text-sm text-emerald-800">
                <div className="flex items-center gap-2 font-semibold mb-2">
                  <CheckCircle size={18} className="text-emerald-600" />
                  Sync complete
                </div>
                <ul className="text-xs space-y-1 text-emerald-700">
                  <li>Total discovered: <strong>{syncResult.total}</strong> groups</li>
                  <li>Imported: <strong>{syncResult.added}</strong> new groups</li>
                  <li>Skipped: <strong>{syncResult.skipped}</strong> already existed</li>
                </ul>
              </div>
            )}

            {err && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                <WarningCircle size={16} />
                {err}
              </div>
            )}

            {syncing && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700">
                <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Opening browser and scraping joined groups... (~15–30s)
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowSync(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
              >
                {syncResult ? 'Close' : 'Cancel'}
              </button>
              {!syncResult && (
                <button
                  type="submit"
                  disabled={syncing || activeAccounts.length === 0}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {syncing ? 'Syncing...' : 'Start Sync'}
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}

      {/* Manual Add Modal */}
      {showAdd && (
        <Modal title="Add Group Manually" onClose={() => setShowAdd(false)}>
          <form onSubmit={(e) => { void handleAdd(e); }} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider">
                Group Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input"
                placeholder="My Facebook Group"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider">
                Facebook Group URL
              </label>
              <input
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                className="input"
                placeholder="https://www.facebook.com/groups/123456789"
                required
              />
            </div>
            {err && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                <WarningCircle size={16} />
                {err}
              </div>
            )}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Adding...' : 'Add Group'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
