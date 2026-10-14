import { useState } from 'react';
import { useAsync } from '../hooks/useAsync.ts';
import { schedulesService } from '../services/schedules.ts';
import { groupsService } from '../services/groups.ts';
import { postsService } from '../services/posts.ts';
import { accountsService } from '../services/accounts.ts';
import { Modal } from '../components/Modal.tsx';
import { Badge } from '../components/Badge.tsx';
import type { Schedule } from '../types/index.ts';

const statusVariant: Record<string, 'green' | 'red' | 'yellow' | 'gray' | 'blue'> = {
  IDLE: 'gray', RUNNING: 'blue', PAUSED: 'yellow', ERROR: 'red',
};

export default function Schedules() {
  const { data: schedules, loading, refetch } = useAsync(() => schedulesService.list(), []);
  const { data: groups } = useAsync(() => groupsService.list(), []);
  const { data: posts } = useAsync(() => postsService.list(), []);
  const { data: accounts } = useAsync(() => accountsService.list(), []);
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', cronExpression: '0 9 * * 1-5', accountId: '', postId: '',
    groupIds: [] as string[], delayMinSec: 300, delayMaxSec: 900,
  });

  function toggleGroup(id: string) {
    setForm((f) => ({
      ...f,
      groupIds: f.groupIds.includes(id) ? f.groupIds.filter((g) => g !== id) : [...f.groupIds, id],
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.groupIds.length) { setErr('Select at least one group'); return; }
    setSaving(true); setErr('');
    try {
      await schedulesService.create(form);
      setShowAdd(false);
      setForm({ name: '', cronExpression: '0 9 * * 1-5', accountId: '', postId: '', groupIds: [], delayMinSec: 300, delayMaxSec: 900 });
      await refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(s: Schedule) {
    await schedulesService.toggle(s.id, !s.isActive);
    await refetch();
  }

  async function runNow(id: string) {
    try {
      await schedulesService.runNow(id);
      await refetch();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this schedule?')) return;
    try {
      await schedulesService.delete(id);
      await refetch();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Schedules</h1>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + New Schedule
        </button>
      </div>

      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Cron</th>
                <th className="px-4 py-3 text-left">Groups</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schedules?.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-600 text-xs">{s.cronExpression}</td>
                  <td className="px-4 py-3 text-gray-500">{s.scheduleGroups.length} group(s)</td>
                  <td className="px-4 py-3"><Badge label={s.status} variant={statusVariant[s.status] ?? 'gray'} /></td>
                  <td className="px-4 py-3"><Badge label={s.isActive ? 'On' : 'Off'} variant={s.isActive ? 'green' : 'gray'} /></td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => runNow(s.id)} className="text-xs text-green-600 hover:underline">Run Now</button>
                    <button onClick={() => toggle(s)} className="text-xs text-blue-600 hover:underline">{s.isActive ? 'Disable' : 'Enable'}</button>
                    <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {!schedules?.length && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No schedules yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="New Schedule" onClose={() => setShowAdd(false)}>
          <form onSubmit={(e) => { void handleCreate(e); }} className="space-y-4">
            <Field label="Schedule Name">
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input" placeholder="Morning Promo" required />
            </Field>
            <Field label="Cron Expression">
              <input value={form.cronExpression} onChange={(e) => setForm((f) => ({ ...f, cronExpression: e.target.value }))}
                className="input" placeholder="0 9 * * 1-5" required />
              <p className="text-xs text-gray-400 mt-1">e.g. <code>0 9 * * *</code> = every day at 9am</p>
            </Field>
            <Field label="Account">
              <select value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                className="input" required>
                <option value="">Select account...</option>
                {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Post Content">
              <select value={form.postId} onChange={(e) => setForm((f) => ({ ...f, postId: e.target.value }))}
                className="input" required>
                <option value="">Select post...</option>
                {posts?.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </Field>
            <Field label="Target Groups (click to select, order matters)">
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {groups?.filter((g) => g.isActive).map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.groupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} />
                    {g.name}
                    {form.groupIds.includes(g.id) && (
                      <span className="text-xs text-blue-600">#{form.groupIds.indexOf(g.id) + 1}</span>
                    )}
                  </label>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min Delay (sec)">
                <input type="number" value={form.delayMinSec} min={30}
                  onChange={(e) => setForm((f) => ({ ...f, delayMinSec: Number(e.target.value) }))}
                  className="input" required />
              </Field>
              <Field label="Max Delay (sec)">
                <input type="number" value={form.delayMaxSec} min={30}
                  onChange={(e) => setForm((f) => ({ ...f, delayMaxSec: Number(e.target.value) }))}
                  className="input" required />
              </Field>
            </div>
            {err && <p className="text-red-500 text-sm">{err}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
