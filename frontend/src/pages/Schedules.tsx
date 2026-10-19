import { useState } from 'react';
import { useAsync } from '../hooks/useAsync.ts';
import { schedulesService } from '../services/schedules.ts';
import { groupsService } from '../services/groups.ts';
import { postsService } from '../services/posts.ts';
import { accountsService } from '../services/accounts.ts';
import { Modal } from '../components/Modal.tsx';
import { Badge } from '../components/Badge.tsx';
import type { Schedule } from '../types/index.ts';
import {
  Plus,
  Play,
  Trash,
  WarningCircle,
  Shuffle,
} from '@phosphor-icons/react';

const statusVariant: Record<string, 'green' | 'red' | 'yellow' | 'gray' | 'blue'> = {
  IDLE: 'gray',
  RUNNING: 'blue',
  PAUSED: 'yellow',
  ERROR: 'red',
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
    name: '',
    cronExpression: '0 9 * * 1-5',
    accountId: '',
    postId: '',
    groupIds: [] as string[],
    delayMinSec: 300,
    delayMaxSec: 900,
  });

  function toggleGroup(id: string) {
    setForm((f) => ({
      ...f,
      groupIds: f.groupIds.includes(id) ? f.groupIds.filter((g) => g !== id) : [...f.groupIds, id],
    }));
  }

  function selectAllRandom() {
    const activeIds = (groups?.filter((g) => g.isActive) || []).map((g) => g.id);
    const shuffled = [...activeIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }
    setForm((f) => ({ ...f, groupIds: shuffled }));
  }

  function deselectAll() {
    setForm((f) => ({ ...f, groupIds: [] }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.groupIds.length) { setErr('Select at least one group'); return; }
    setSaving(true);
    setErr('');
    try {
      await schedulesService.create(form);
      setShowAdd(false);
      setForm({
        name: '',
        cronExpression: '0 9 * * 1-5',
        accountId: '',
        postId: '',
        groupIds: [],
        delayMinSec: 300,
        delayMaxSec: 900,
      });
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
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this schedule?')) return;
    try {
      await schedulesService.delete(id);
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200/80">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Schedules</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Automated posting cron triggers, target matrix, and pacing intervals.
          </p>
        </div>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-xs transition-colors w-full sm:w-auto self-start sm:self-auto cursor-pointer"
          >
            <Plus size={16} weight="bold" />
            New Schedule
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[620px]">
          <thead className="bg-zinc-50/75 text-zinc-500 text-[11px] font-semibold uppercase tracking-wider border-b border-zinc-100">
            <tr>
              <th className="px-5 py-3.5 text-left">Name</th>
              <th className="px-5 py-3.5 text-left">Cron</th>
              <th className="px-5 py-3.5 text-left">Groups</th>
              <th className="px-5 py-3.5 text-left">Status</th>
              <th className="px-5 py-3.5 text-left">Active</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-zinc-400">
                  <div className="inline-flex items-center gap-2 text-sm text-zinc-500">
                    <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Loading schedules...
                  </div>
                </td>
              </tr>
            ) : schedules?.map((s) => (
              <tr key={s.id} className="hover:bg-zinc-50/60 transition-colors">
                <td className="px-5 py-3.5 font-bold text-zinc-900 tracking-tight">{s.name}</td>
                <td className="px-5 py-3.5">
                  <code className="text-xs text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md font-mono font-medium">
                    {s.cronExpression}
                  </code>
                </td>
                <td className="px-5 py-3.5 text-zinc-600 font-medium">
                  {s.scheduleGroups.length} group(s)
                </td>
                <td className="px-5 py-3.5">
                  <Badge
                    label={s.status}
                    variant={statusVariant[s.status] ?? 'gray'}
                    pulse={s.status === 'RUNNING'}
                  />
                </td>
                <td className="px-5 py-3.5">
                  <Badge
                    label={s.isActive ? 'On' : 'Off'}
                    variant={s.isActive ? 'green' : 'gray'}
                  />
                </td>
                <td className="px-5 py-3.5 text-right space-x-2">
                  <button
                    onClick={() => runNow(s.id)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors inline-flex items-center gap-1"
                  >
                    <Play size={12} weight="fill" />
                    Run Now
                  </button>
                  <button
                    onClick={() => toggle(s)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                  >
                    {s.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors inline-flex items-center gap-1"
                  >
                    <Trash size={12} />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loading && !schedules?.length && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-zinc-400">
                  <p className="text-sm font-medium">No schedules configured</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Click the button above to automate group posting.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* New Schedule Modal */}
      {showAdd && (
        <Modal title="New Schedule" onClose={() => setShowAdd(false)}>
          <form onSubmit={(e) => { void handleCreate(e); }} className="space-y-4">
            <Field label="Schedule Name">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input"
                placeholder="Morning Promo"
                required
              />
            </Field>

            <Field label="Cron Expression">
              <input
                value={form.cronExpression}
                onChange={(e) => setForm((f) => ({ ...f, cronExpression: e.target.value }))}
                className="input font-mono"
                placeholder="0 9 * * 1-5"
                required
              />
              <p className="text-[11px] text-zinc-400 mt-1">
                e.g. <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-600">0 9 * * *</code> = daily at 9:00 AM
              </p>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Account">
                <select
                  value={form.accountId}
                  onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                  className="input cursor-pointer"
                  required
                >
                  <option value="">Select account...</option>
                  {accounts?.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Post Content">
                <select
                  value={form.postId}
                  onChange={(e) => setForm((f) => ({ ...f, postId: e.target.value }))}
                  className="input cursor-pointer"
                  required
                >
                  <option value="">Select post...</option>
                  {posts?.filter((p) => p.isActive).map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                  Target Groups (order preserved)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={selectAllRandom}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 transition-colors"
                    title="Select all active groups in random order"
                  >
                    <Shuffle size={13} weight="bold" />
                    Select All (Random)
                  </button>
                  {form.groupIds.length > 0 && (
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="text-[11px] font-medium text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 px-1.5 py-0.5 rounded transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto p-2 rounded-xl bg-zinc-50 border border-zinc-200">
                {groups?.filter((g) => g.isActive).map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-zinc-200/60 text-xs font-medium text-zinc-800 cursor-pointer hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.groupIds.includes(g.id)}
                        onChange={() => toggleGroup(g.id)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>{g.name}</span>
                    </div>
                    {form.groupIds.includes(g.id) && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        #{form.groupIds.indexOf(g.id) + 1}
                      </span>
                    )}
                  </label>
                ))}
                {!groups?.some((g) => g.isActive) && (
                  <p className="text-xs text-zinc-400 text-center py-2">No active groups available</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Min Delay (sec)">
                <input
                  type="number"
                  value={form.delayMinSec}
                  min={1}
                  onChange={(e) => setForm((f) => ({ ...f, delayMinSec: Number(e.target.value) }))}
                  className="input"
                  required
                />
              </Field>
              <Field label="Max Delay (sec)">
                <input
                  type="number"
                  value={form.delayMaxSec}
                  min={1}
                  onChange={(e) => setForm((f) => ({ ...f, delayMaxSec: Number(e.target.value) }))}
                  className="input"
                  required
                />
              </Field>
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
      <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}
