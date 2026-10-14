import { useState } from 'react';
import { useAsync } from '../hooks/useAsync.ts';
import { groupsService } from '../services/groups.ts';
import { accountsService } from '../services/accounts.ts';
import { Modal } from '../components/Modal.tsx';
import { Badge } from '../components/Badge.tsx';
import type { Group } from '../types/index.ts';

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
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowSync(true); setSyncResult(null); setErr(''); }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            ↻ Sync from Facebook
          </button>
          <button
            onClick={() => { setShowAdd(true); setErr(''); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Add Manually
          </button>
        </div>
      </div>

      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Group ID</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groups?.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <a href={g.url} target="_blank" rel="noreferrer" className="hover:text-blue-600 hover:underline">
                      {g.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{g.fbGroupId}</td>
                  <td className="px-4 py-3">
                    <Badge label={g.isActive ? 'Active' : 'Disabled'} variant={g.isActive ? 'green' : 'gray'} />
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => toggleActive(g)} className="text-xs text-blue-600 hover:underline">
                      {g.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => handleDelete(g.id)} className="text-xs text-red-500 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!groups?.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                    No groups yet — click <strong>Sync from Facebook</strong> to import your joined groups.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Sync Modal */}
      {showSync && (
        <Modal title="Sync Groups from Facebook" onClose={() => setShowSync(false)}>
          <form onSubmit={(e) => { void handleSync(e); }} className="space-y-4">
            <p className="text-sm text-gray-600">
              Opens a browser with your saved session and automatically imports all Facebook Groups you have joined.
              Groups already in the list will be skipped.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
              {activeAccounts.length === 0 ? (
                <p className="text-sm text-red-500">No active accounts found. Set up a session first.</p>
              ) : (
                <select
                  value={syncAccountId}
                  onChange={(e) => setSyncAccountId(e.target.value)}
                  className="input"
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
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm">
                <p className="font-semibold text-green-800 mb-1">Sync complete</p>
                <ul className="text-green-700 space-y-0.5">
                  <li>Found: <strong>{syncResult.total}</strong> groups</li>
                  <li>Added: <strong>{syncResult.added}</strong> new groups</li>
                  <li>Skipped: <strong>{syncResult.skipped}</strong> already existed</li>
                </ul>
              </div>
            )}

            {err && <p className="text-red-500 text-sm">{err}</p>}

            {syncing && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Opening browser and scraping groups... this may take 15–30 seconds.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSync(false)}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                {syncResult ? 'Close' : 'Cancel'}
              </button>
              {!syncResult && (
                <button
                  type="submit"
                  disabled={syncing || activeAccounts.length === 0}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input"
                placeholder="My Facebook Group"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facebook Group URL</label>
              <input
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                className="input"
                placeholder="https://www.facebook.com/groups/123456789"
                required
              />
            </div>
            {err && <p className="text-red-500 text-sm">{err}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Adding...' : 'Add Group'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
