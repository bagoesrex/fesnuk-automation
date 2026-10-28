import { useState, useMemo } from 'react';
import { useAsync } from '../hooks/useAsync.ts';
import { postsService } from '../services/posts.ts';
import { useAccount } from '../context/AccountContext.tsx';
import { Modal } from '../components/Modal.tsx';
import { Badge } from '../components/Badge.tsx';
import { NoAccountsCard } from '../components/NoAccountsCard.tsx';
import type { Post } from '../types/index.ts';
import {
  Plus,
  Trash,
  Image as ImageIcon,
  WarningCircle,
  X,
  CaretLeft,
  CaretRight,
  MagnifyingGlassPlus,
} from '@phosphor-icons/react';

function getImageUrl(relPath: string) {
  const clean = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  return `/${clean}`;
}

export default function Posts() {
  const { selectedAccountId, accounts, loading: loadingAccounts } = useAccount();
  const { data: posts, loading, refetch } = useAsync(
    () => postsService.list(selectedAccountId ?? undefined),
    [selectedAccountId]
  );
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // Image lightbox preview
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; title: string } | null>(
    null
  );

  // Object URLs for newly chosen files in modal
  const filePreviews = useMemo(() => {
    return selectedFiles.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
    }));
  }, [selectedFiles]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...incoming].slice(0, 5));
    e.target.value = '';
  }

  function handleRemoveFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleCloseModal() {
    setShowAdd(false);
    setForm({ title: '', content: '' });
    setSelectedFiles([]);
    setErr('');
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccountId) {
      setErr('Please select or add an account first');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('content', form.content);
      fd.append('accountId', selectedAccountId);
      selectedFiles.forEach((f) => fd.append('images', f));
      await postsService.create(fd);
      handleCloseModal();
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

  function openLightbox(post: Post, initialIndex = 0) {
    if (!post.imagePaths.length) return;
    setLightbox({
      images: post.imagePaths.map(getImageUrl),
      index: initialIndex,
      title: post.title,
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200/80">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Posts</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Message templates and multimedia content for automated distribution.
          </p>
        </div>
        <button
          onClick={() => {
            setShowAdd(true);
            setErr('');
          }}
          disabled={!selectedAccountId}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-xs transition-colors w-full sm:w-auto self-start sm:self-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} weight="bold" />
          Create Post
        </button>
      </div>

      {!loadingAccounts && accounts.length === 0 && <NoAccountsCard />}

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
              {/* Image Preview / Thumbnail */}
              {p.imagePaths[0] ? (
                <div className="flex flex-col gap-2 shrink-0">
                  <div
                    onClick={() => openLightbox(p, 0)}
                    className="group relative w-28 h-28 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200/80 cursor-pointer shadow-xs"
                  >
                    <img
                      src={getImageUrl(p.imagePaths[0])}
                      alt={p.title}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-zinc-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <MagnifyingGlassPlus size={20} weight="bold" />
                    </div>
                    {p.imagePaths.length > 1 && (
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-zinc-950/75 text-[10px] font-bold text-white backdrop-blur-xs">
                        +{p.imagePaths.length - 1}
                      </span>
                    )}
                  </div>

                  {/* Thumbnail row if more than 1 image */}
                  {p.imagePaths.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      {p.imagePaths.slice(1, 4).map((path, idx) => (
                        <div
                          key={path}
                          onClick={() => openLightbox(p, idx + 1)}
                          className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-200 cursor-pointer hover:border-blue-500 transition-colors"
                        >
                          <img
                            src={getImageUrl(path)}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                      {p.imagePaths.length > 4 && (
                        <span className="text-[10px] font-semibold text-zinc-400">
                          +{p.imagePaths.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-28 h-28 rounded-xl bg-zinc-50 border border-zinc-200/60 flex flex-col items-center justify-center text-zinc-400 shrink-0">
                  <ImageIcon size={26} weight="duotone" />
                  <span className="text-[10px] mt-1 font-medium">Text Only</span>
                </div>
              )}

              {/* Content Body */}
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
                  <p className="text-sm text-zinc-600 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                    {p.content}
                  </p>
                  {p.imagePaths.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2.5">
                      <button
                        type="button"
                        onClick={() => openLightbox(p, 0)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-2 py-0.5 rounded-md transition-colors"
                      >
                        <ImageIcon size={13} weight="bold" />
                        {p.imagePaths.length} image{p.imagePaths.length > 1 ? 's' : ''} (Click to preview)
                      </button>
                    </div>
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
                Click <strong>Create Post</strong> to compose your first automated message.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Post Modal */}
      {showAdd && (
        <Modal title="Create Post" onClose={handleCloseModal}>
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

            {/* Images Upload & Live Preview */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                  Images (optional, max 5)
                </label>
                <span className="text-[11px] text-zinc-400 font-medium">
                  {selectedFiles.length} / 5 selected
                </span>
              </div>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={selectedFiles.length >= 5}
                onChange={handleFileChange}
                className="block w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-zinc-200 file:text-xs file:font-semibold file:bg-zinc-50 file:text-zinc-700 hover:file:bg-zinc-100 cursor-pointer disabled:opacity-50"
              />

              {/* Selected Images Grid Preview */}
              {filePreviews.length > 0 && (
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2 p-2.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                  {filePreviews.map(({ file, url }, index) => (
                    <div
                      key={index}
                      className="group relative aspect-square rounded-lg overflow-hidden border border-zinc-200 bg-white"
                    >
                      <img
                        src={url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-zinc-950/70 text-white hover:bg-rose-600 transition-colors"
                        title="Remove image"
                      >
                        <X size={12} weight="bold" />
                      </button>
                      <div className="absolute inset-x-0 bottom-0 bg-zinc-950/60 p-0.5 text-[9px] text-zinc-200 truncate text-center">
                        {file.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                onClick={handleCloseModal}
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

      {/* Lightbox Modal */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md transition-opacity"
            onClick={() => setLightbox(null)}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-4xl max-h-[90vh] flex flex-col items-center">
            {/* Top Toolbar */}
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <div className="flex items-center gap-3">
                <p className="text-sm font-bold tracking-tight truncate">{lightbox.title}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-medium">
                  {lightbox.index + 1} of {lightbox.images.length}
                </span>
              </div>
              <button
                onClick={() => setLightbox(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Main Preview Image */}
            <div className="relative flex items-center justify-center rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl">
              <img
                src={lightbox.images[lightbox.index]}
                alt={lightbox.title}
                className="max-h-[75vh] max-w-[85vw] object-contain"
              />

              {/* Prev button */}
              {lightbox.images.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setLightbox((prev) =>
                      prev
                        ? {
                            ...prev,
                            index: (prev.index - 1 + prev.images.length) % prev.images.length,
                          }
                        : null
                    )
                  }
                  className="absolute left-3 p-2 rounded-full bg-zinc-950/60 text-white hover:bg-zinc-900 border border-white/10 transition-colors"
                  aria-label="Previous image"
                >
                  <CaretLeft size={20} weight="bold" />
                </button>
              )}

              {/* Next button */}
              {lightbox.images.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setLightbox((prev) =>
                      prev
                        ? {
                            ...prev,
                            index: (prev.index + 1) % prev.images.length,
                          }
                        : null
                    )
                  }
                  className="absolute right-3 p-2 rounded-full bg-zinc-950/60 text-white hover:bg-zinc-900 border border-white/10 transition-colors"
                  aria-label="Next image"
                >
                  <CaretRight size={20} weight="bold" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
