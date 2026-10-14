import { useState } from 'react';
import { useAsync } from '../hooks/useAsync.ts';
import { groupsService } from '../services/groups.ts';
import { Modal } from '../components/Modal.tsx';
import { Badge } from '../components/Badge.tsx';
import type { Group } from '../types/index.ts';

export default function Groups() {
  const { data: groups, loading, refetch } = useAsync(() => groupsService.list(), []);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', url: '' });
  const [saving, setSaving] = useState(false);
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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Add Group
        </button>
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
                  <td className="px-4 py-3 font-medium text-gray-900">{g.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{g.fbGroupId}</td>
                  <td className="px-4 py-3">
                    <Badge label={g.isActive ? 'Active' : 'Disabled'} variant={g.isActive ? 'green' : 'gray'} />
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => toggleActive(g)} className="text-xs text-blue-600 hover:underline">
                      {g.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => handleDelete(g.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {!groups?.length && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No groups yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="Add Group" onClose={() => setShowAdd(false)}>
          <form onSubmit={(e) => { void handleAdd(e); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Facebook Group" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facebook Group URL</label>
              <input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://www.facebook.com/groups/123456789" required />
            </div>
            {err && <p className="text-red-500 text-sm">{err}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
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
