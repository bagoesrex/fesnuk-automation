import { useState } from 'react';
import { useAsync } from '../hooks/useAsync.ts';
import { postsService } from '../services/posts.ts';
import { Modal } from '../components/Modal.tsx';
import { Badge } from '../components/Badge.tsx';
import type { Post } from '../types/index.ts';

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
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Create Post
        </button>
      </div>

      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="grid gap-4">
          {posts?.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5 flex gap-4">
              {p.imagePaths[0] && (
                <img src={`${API_BASE}/${p.imagePaths[0]}`} alt="" className="w-20 h-20 object-cover rounded-lg shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{p.title}</p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.content}</p>
                    {p.imagePaths.length > 0 && <p className="text-xs text-gray-400 mt-1">{p.imagePaths.length} image(s)</p>}
                  </div>
                  <Badge label={p.isActive ? 'Active' : 'Disabled'} variant={p.isActive ? 'green' : 'gray'} />
                </div>
                <div className="flex gap-3 mt-3">
                  <button onClick={() => toggleActive(p)} className="text-xs text-blue-600 hover:underline">
                    {p.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
          {!posts?.length && <p className="text-gray-400 text-center py-12">No posts yet</p>}
        </div>
      )}

      {showAdd && (
        <Modal title="Create Post" onClose={() => setShowAdd(false)}>
          <form onSubmit={(e) => { void handleAdd(e); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Internal Title</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Promo Oktober" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Post Content</label>
              <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Write your post content here..." required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Images (optional, max 5)</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple
                onChange={(e) => setFiles(e.target.files)}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
            {err && <p className="text-red-500 text-sm">{err}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Post'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
