import { useState } from 'react';
import { useAsync } from '../hooks/useAsync.ts';
import { accountsService } from '../services/accounts.ts';
import { Badge } from '../components/Badge.tsx';
import {
  Key,
  Browser,
  CheckCircle,
  WarningCircle,
  Trash,
  Plus,
  Globe,
  DownloadSimple,
  UploadSimple,
} from '@phosphor-icons/react';

export default function Session() {
  const { data: accounts, loading, refetch } = useAsync(() => accountsService.list(), []);
  const [mode, setMode] = useState<'browser' | 'import'>('browser');
  const [step, setStep] = useState<'idle' | 'waiting' | 'done'>('idle');
  const [name, setName] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [sessionJson, setSessionJson] = useState('');
  const [err, setErr] = useState('');
  const [deleteErr, setDeleteErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function startSession() {
    if (!name.trim()) {
      setErr('Enter a name');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await accountsService.startSession(name.trim(), proxyUrl.trim() || undefined);
      setStep('waiting');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function confirmSession() {
    setBusy(true);
    setErr('');
    try {
      await accountsService.confirmSession();
      setStep('done');
      setName('');
      setProxyUrl('');
      await refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleImportSession(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr('Enter an account name');
      return;
    }
    if (!sessionJson.trim()) {
      setErr('Paste or upload your session JSON data');
      return;
    }

    setBusy(true);
    setErr('');
    try {
      await accountsService.importSession(name.trim(), sessionJson.trim(), proxyUrl.trim() || undefined);
      setStep('done');
      setName('');
      setProxyUrl('');
      setSessionJson('');
      await refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to import session');
    } finally {
      setBusy(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setSessionJson(text);
      if (!name) {
        setName(file.name.replace(/\.[^.]+$/, '').replace(/^session-?/, ''));
      }
    };
    reader.readAsText(file);
  }

  async function handleExport(id: string, accName: string) {
    try {
      await accountsService.exportSession(id, accName);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Export failed');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this account and its session?')) return;
    setDeleteErr('');
    try {
      await accountsService.delete(id);
      await refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete account';
      setDeleteErr(msg);
      alert(msg);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-zinc-200/80">
        <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Session Setup</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Authenticate and store Facebook browser sessions for headless posting.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1 bg-zinc-200/60 rounded-xl w-full sm:w-fit">
        <button
          onClick={() => {
            setMode('browser');
            setStep('idle');
            setErr('');
          }}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
            mode === 'browser'
              ? 'bg-white text-zinc-900 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Browser size={16} />
          Browser Login (Local)
        </button>
        <button
          onClick={() => {
            setMode('import');
            setStep('idle');
            setErr('');
          }}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
            mode === 'import'
              ? 'bg-white text-zinc-900 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <UploadSimple size={16} />
          Import Session JSON (VPS)
        </button>
      </div>

      {/* Session Initializer Card */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 max-w-xl shadow-xs">
        {step === 'done' ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle size={28} weight="fill" />
            </div>
            <div>
              <p className="text-base font-bold text-zinc-900">Session saved successfully!</p>
              <p className="text-xs text-zinc-500 mt-1">
                Your credentials and storage state are safely stored for automated task execution.
              </p>
            </div>
            <button
              onClick={() => setStep('idle')}
              className="inline-flex items-center gap-1.5 px-4 py-2 mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors"
            >
              <Plus size={14} weight="bold" />
              Add another account
            </button>
          </div>
        ) : mode === 'browser' ? (
          step === 'idle' ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/70 border border-blue-100">
                <Browser size={20} className="text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-900 leading-relaxed">
                  Clicking the button below launches a Playwright browser window. Log into Facebook manually, then return here to confirm.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider">
                  Account Name
                </label>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (err) setErr('');
                  }}
                  className="input"
                  placeholder="Main Account"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                  <span>Proxy URL (Optional)</span>
                  <span className="text-[10px] text-zinc-400 font-normal lowercase">recommended for VPS</span>
                </label>
                <input
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  className="input font-mono text-xs"
                  placeholder="http://user:pass@host:port or host:port:user:pass"
                />
              </div>

              {err && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  <WarningCircle size={16} />
                  {err}
                </div>
              )}

              <button
                onClick={() => {
                  void startSession();
                }}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 shadow-xs transition-colors"
              >
                <Key size={16} weight="bold" />
                {busy ? 'Opening Browser...' : 'Start Session Setup'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200/80 rounded-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-900">Browser is open</p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Complete manual login in the browser window and reach your Facebook home feed.
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed">
                Once you are fully logged in and on the Facebook home page, click{' '}
                <strong className="font-semibold text-zinc-900">Confirm Login</strong> to capture cookies and state.
              </p>

              {err && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  <WarningCircle size={16} />
                  {err}
                </div>
              )}

              <button
                onClick={() => {
                  void confirmSession();
                }}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 shadow-xs transition-colors"
              >
                <CheckCircle size={16} weight="bold" />
                {busy ? 'Saving Session...' : 'Confirm Login'}
              </button>
            </div>
          )
        ) : (
          /* Import Mode Form */
          <form onSubmit={handleImportSession} className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-purple-50/70 border border-purple-100">
              <UploadSimple size={20} className="text-purple-600 mt-0.5 shrink-0" />
              <p className="text-xs text-purple-900 leading-relaxed">
                Upload or paste a saved Playwright <code className="font-mono text-purple-950 font-semibold">storageState.json</code> or cookie array. Useful for headless VPS deployments without GUI!
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider">
                Account Name
              </label>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (err) setErr('');
                }}
                className="input"
                placeholder="VPS Account"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                <span>Proxy URL (Optional)</span>
                <span className="text-[10px] text-zinc-400 font-normal lowercase">recommended for VPS</span>
              </label>
              <input
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                className="input font-mono text-xs"
                placeholder="http://user:pass@host:port or host:port:user:pass"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                <span>Session Data (JSON)</span>
                <label className="text-[11px] text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                  Upload .json file
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </label>
              <textarea
                rows={5}
                value={sessionJson}
                onChange={(e) => {
                  setSessionJson(e.target.value);
                  if (err) setErr('');
                }}
                className="input font-mono text-xs"
                placeholder='{"cookies": [...], "origins": [...]}'
              />
            </div>

            {err && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                <WarningCircle size={16} />
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 shadow-xs transition-colors"
            >
              <UploadSimple size={16} weight="bold" />
              {busy ? 'Importing...' : 'Import & Save Session'}
            </button>
          </form>
        )}
      </div>

      {/* Saved Accounts Table */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-950 tracking-tight">Saved Accounts</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Active sessions authenticated on this instance.
          </p>
        </div>

        {deleteErr && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            <WarningCircle size={16} />
            {deleteErr}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[580px]">
            <thead className="bg-zinc-50/75 text-zinc-500 text-[11px] font-semibold uppercase tracking-wider border-b border-zinc-100">
              <tr>
                <th className="px-5 py-3.5 text-left">Name</th>
                <th className="px-5 py-3.5 text-left">Proxy</th>
                <th className="px-5 py-3.5 text-left">Status</th>
                <th className="px-5 py-3.5 text-left">Added</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-zinc-400">
                    <div className="inline-flex items-center gap-2 text-sm text-zinc-500">
                      <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Loading accounts...
                    </div>
                  </td>
                </tr>
              ) : accounts?.map((a) => (
                <tr key={a.id} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-zinc-900">{a.name}</td>
                  <td className="px-5 py-3.5 text-xs font-mono text-zinc-600">
                    {a.proxyUrl ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-medium">
                        <Globe size={13} className="text-blue-600 shrink-0" />
                        {a.proxyUrl.replace(/:[^:@]+@/, ':***@')}
                      </span>
                    ) : (
                      <span className="text-zinc-400 italic">Direct</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge
                      label={a.isActive ? 'Active' : 'Inactive'}
                      variant={a.isActive ? 'green' : 'gray'}
                      pulse={a.isActive}
                    />
                  </td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500 font-mono">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-2">
                    <button
                      onClick={() => handleExport(a.id, a.name)}
                      title="Download session JSON for VPS or backup"
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors inline-flex items-center gap-1"
                    >
                      <DownloadSimple size={13} />
                      Export
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors inline-flex items-center gap-1"
                    >
                      <Trash size={12} />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && !accounts?.length && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-zinc-400">
                    <p className="text-sm font-medium">No accounts yet</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Configure your first Facebook account session above.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
