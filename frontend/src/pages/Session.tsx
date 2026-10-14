import { useState } from 'react';
import { useAsync } from '../hooks/useAsync.ts';
import { accountsService } from '../services/accounts.ts';
import { Badge } from '../components/Badge.tsx';

export default function Session() {
  const { data: accounts, loading, refetch } = useAsync(() => accountsService.list(), []);
  const [step, setStep] = useState<'idle' | 'waiting' | 'done'>('idle');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function startSession() {
    if (!name.trim()) { setErr('Enter a name'); return; }
    setBusy(true); setErr('');
    try {
      await accountsService.startSession(name.trim());
      setStep('waiting');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function confirmSession() {
    setBusy(true); setErr('');
    try {
      await accountsService.confirmSession();
      setStep('done');
      setName('');
      await refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this account and its session?')) return;
    try {
      await accountsService.delete(id);
      await refetch();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Session Setup</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 max-w-md">
        {step === 'idle' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Open a browser window to log into Facebook manually. The session will be saved automatically.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Main Account" />
            </div>
            {err && <p className="text-red-500 text-sm">{err}</p>}
            <button onClick={() => { void startSession(); }} disabled={busy}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {busy ? 'Opening Browser...' : 'Start Session Setup'}
            </button>
          </div>
        )}

        {step === 'waiting' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <p className="text-sm text-yellow-800 font-medium">Browser is open — log in to Facebook now</p>
            </div>
            <p className="text-sm text-gray-600">
              Once you are logged in and on the Facebook home page, click <strong>Confirm Login</strong>.
            </p>
            {err && <p className="text-red-500 text-sm">{err}</p>}
            <button onClick={() => { void confirmSession(); }} disabled={busy}
              className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {busy ? 'Saving Session...' : 'Confirm Login'}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-4">
            <p className="text-green-600 font-semibold">Session saved successfully!</p>
            <button onClick={() => setStep('idle')} className="mt-3 text-sm text-blue-600 hover:underline">
              Add another account
            </button>
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Saved Accounts</h2>
      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Added</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts?.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                  <td className="px-4 py-3"><Badge label={a.isActive ? 'Active' : 'Inactive'} variant={a.isActive ? 'green' : 'gray'} /></td>
                  <td className="px-4 py-3 text-gray-500">{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(a.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
              {!accounts?.length && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No accounts yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
