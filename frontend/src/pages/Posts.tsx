import { useState } from 'react';
import { useAsync } from '../hooks/useAsync.ts';
import { postsService } from '../services/posts.ts';
import { Modal } from '../components/Modal.tsx';
import { Badge } from '../components/Badge.tsx';
import type { Post } from '../types/index.ts';
import {
  Plus,
  Trash,
  Image as ImageIcon,
  WarningCircle,
} from '@phosphor-icons/react';

const API_BASE = (import.meta.env['VITE_API_URL'] as string ?? '/api/v1').replace('/api/v1', '');

export default function Posts() {
  const { data: posts, loading, refetch } = useAsync(() => postsService.list(), []);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });
  const [files, setFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('content', form.content);
      if (files) Array.from(files).forEach((f) => fd.append('images', f));
      await postsService.create(fd);
      setShowAdd(false);
      setForm({ title: '', content: '' });
      setFiles(null);
      await refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: Post) {
    await postsService.update(p.id, { isActive: !p.isActive });
    await refetch();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this post and its images?')) return;
    try {
      await postsService.delete(id);
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200/80">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Posts</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Message templates and multimedia content for automated distribution.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus size={16} weight="bold" />
          + Create Post
        </button>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="p-12 text-center text-zinc-400">
          <div className="inline-flex items-center gap-2 text-sm text-zinc-500">
            <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Loading posts...
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts?.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs hover:border-zinc-300 transition-all flex flex-col sm:flex-row gap-5"
            >
              {p.imagePaths[0] ? (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200/60 shrink-0">
                  <img
                    src={`${API_BASE}/${p.imagePaths[0]}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {p.imagePaths.length > 1 && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-zinc-950/70 text-[10px] font-bold text-white backdrop-blur-xs">
                      +{p.imagePaths.length - 1}
                    </span>
                  )}
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl bg-zinc-50 border border-zinc-200/60 flex flex-col items-center justify-center text-zinc-400 shrink-0">
                  <ImageIcon size={22} weight="duotone" />
                  <span className="text-[10px] mt-1 font-medium">Text Only</span>
                </div>
              )}

              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <p className="font-bold text-zinc-950 text-base tracking-tight">{p.title}</p>
                    <Badge
                      label={p.isActive ? 'Active' : 'Disabled'}
                      variant={p.isActive ? 'green' : 'gray'}
                      pulse={p.isActive}
                    />
                  </div>
                  <p className="text-sm text-zinc-600 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                    {p.content}
                  </p>
                  {p.imagePaths.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 mt-2">
                      <ImageIcon size={13} />
                      {p.imagePaths.length} attachment(s)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-100">
                  <button
                    onClick={() => toggleActive(p)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                  >
                    {p.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors inline-flex items-center gap-1"
                  >
                    <Trash size={13} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {!posts?.length && (
            <div className="p-12 text-center text-zinc-400 bg-white rounded-2xl border border-zinc-200/80">
              <p className="text-sm font-medium">No posts yet</p>
              <p className="text-xs text-zinc-500 mt-1">
                Click <strong>+ Create Post</strong> to compose your first automated message.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Post Modal */}
      {showAdd && (
        <Modal title="Create Post" onClose={() => setShowAdd(false)}>
          <form onSubmit={(e) => { void handleAdd(e); }} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider">
                Internal Title
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="input"
                placeholder="e.g. Promo Oktober"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider">
                Post Content
              </label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={5}
                className="input resize-none"
                placeholder="Write your post content here..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider">
                Images (optional, max 5)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="block w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-zinc-200 file:text-xs file:font-semibold file:bg-zinc-50 file:text-zinc-700 hover:file:bg-zinc-100 cursor-pointer"
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
                {saving ? 'Creating...' : 'Create Post'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
