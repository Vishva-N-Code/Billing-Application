import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Trash2, Edit3, Check, FilePlus, Image, File } from 'lucide-react';
import { getAllMediaItems, saveMediaItem, updateMediaItem, deleteMediaItem } from '../db';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'signature', label: 'Signatures' },
  { key: 'stamp', label: 'Stamps' },
  { key: 'other', label: 'Other' },
];

const CAT_COLORS = {
  signature: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
  stamp: { bg: 'rgba(255,183,0,0.15)', color: '#ffb700' },
  other: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
};

export default function MediaLibraryPanel({ open, onClose, onSelect }) {
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('signature');
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  const load = async () => {
    const data = await getAllMediaItems();
    setItems(data);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleFiles = async (files) => {
    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      if (!isImage && !isPdf) continue;
      const reader = new FileReader();
      await new Promise((resolve) => {
        reader.onload = async (ev) => {
          await saveMediaItem({
            name: file.name.replace(/\.[^.]+$/, ''),
            originalFileName: file.name,
            type: isPdf ? 'pdf' : 'image',
            category: uploadCategory,
            dataUrl: ev.target.result,
            uploadedAt: new Date().toISOString(),
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    await load();
    showToast(`${files.length} file(s) uploaded successfully`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this file from the library?')) return;
    await deleteMediaItem(id);
    await load();
    showToast('File deleted', 'danger');
  };

  const startEdit = (item) => { setEditingId(item.id); setEditName(item.name); };

  const saveEdit = async (id) => {
    if (editName.trim()) await updateMediaItem(id, { name: editName.trim() });
    setEditingId(null);
    await load();
  };

  const filtered = activeCategory === 'all' ? items : items.filter((i) => i.category === activeCategory);

  const panel = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          zIndex: 99998,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Drawer Panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '560px', maxWidth: '96vw',
          background: '#0d1117',
          borderLeft: '1px solid rgba(255,183,0,0.2)',
          boxShadow: '-20px 0 80px rgba(0,0,0,0.7)',
          zIndex: 99999,
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.38s cubic-bezier(0.16, 1, 0.3, 1)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '22px 24px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,183,0,0.04)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'rgba(255,183,0,0.12)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#ffb700',
              border: '1px solid rgba(255,183,0,0.2)',
            }}>
              <FilePlus size={20} />
            </div>
            <div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#f8fafc' }}>
                Official Documents
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '2px' }}>
                {items.length} file{items.length !== 1 ? 's' : ''} stored · Signatures, Stamps &amp; more
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px', padding: '8px', cursor: 'pointer', color: '#94a3b8',
              display: 'flex', alignItems: 'center', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <X size={17} />
          </button>
        </div>

        {/* ── Upload Zone ── */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          {/* Category selector */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', marginRight: '2px' }}>Save as:</span>
            {CATEGORIES.filter(c => c.key !== 'all').map((c) => (
              <button
                key={c.key}
                onClick={() => setUploadCategory(c.key)}
                style={{
                  padding: '5px 14px', borderRadius: '20px', cursor: 'pointer',
                  fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.72rem',
                  border: '1px solid',
                  borderColor: uploadCategory === c.key ? '#ffb700' : 'rgba(255,255,255,0.1)',
                  background: uploadCategory === c.key ? 'rgba(255,183,0,0.15)' : 'rgba(255,255,255,0.03)',
                  color: uploadCategory === c.key ? '#ffb700' : '#94a3b8',
                  transition: 'all 0.18s',
                  letterSpacing: '0.02em',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles([...e.dataTransfer.files]); }}
            onClick={() => fileRef.current.click()}
            style={{
              border: `2px dashed ${dragOver ? '#ffb700' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '12px', padding: '18px 24px',
              textAlign: 'center', cursor: 'pointer',
              background: dragOver ? 'rgba(255,183,0,0.07)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s',
              color: dragOver ? '#ffb700' : '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px',
            }}
          >
            <Upload size={22} style={{ flexShrink: 0, opacity: 0.8 }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: dragOver ? '#ffb700' : '#94a3b8' }}>
                Click or drag &amp; drop to upload
              </div>
              <div style={{ fontSize: '0.7rem', marginTop: '2px', color: '#475569' }}>
                JPG, PNG, PDF — multiple files supported
              </div>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files.length) handleFiles([...e.target.files]); e.target.value = ''; }}
          />
        </div>

        {/* ── Category Filter Tabs ── */}
        <div style={{
          display: 'flex', gap: '4px', padding: '12px 24px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              style={{
                padding: '6px 16px', borderRadius: '8px', border: 'none',
                fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.78rem',
                cursor: 'pointer', transition: 'all 0.18s',
                background: activeCategory === c.key ? '#ffb700' : 'rgba(255,255,255,0.04)',
                color: activeCategory === c.key ? '#000' : '#64748b',
                letterSpacing: '0.02em',
              }}
            >
              {c.label}&nbsp;
              <span style={{ opacity: 0.7, fontWeight: 500, fontSize: '0.7rem' }}>
                {c.key === 'all' ? items.length : items.filter(i => i.category === c.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* ── File List ── */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569', padding: '40px 20px', textAlign: 'center' }}>
              <Image size={40} style={{ opacity: 0.2, marginBottom: '14px' }} />
              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#64748b' }}>No files yet</div>
              <div style={{ fontSize: '0.75rem', marginTop: '6px', color: '#475569' }}>Upload your first file using the area above</div>
            </div>
          )}

          {filtered.map((item) => {
            const catStyle = CAT_COLORS[item.category] || CAT_COLORS.other;
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex', gap: '14px', alignItems: 'flex-start',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(255,255,255,0.025)',
                  transition: 'all 0.2s',
                  cursor: 'default',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,183,0,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
              >
                {/* Thumbnail */}
                <div style={{
                  width: '72px', height: '72px', borderRadius: '10px',
                  overflow: 'hidden', background: '#fff', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  {item.type === 'image' ? (
                    <img src={item.dataUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <File size={28} style={{ color: '#ffb700' }} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === item.id ? (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus
                        style={{
                          flex: 1, background: 'rgba(255,255,255,0.05)',
                          border: '1px solid #ffb700', borderRadius: '8px',
                          padding: '6px 10px', color: '#f8fafc',
                          fontFamily: 'inherit', fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => saveEdit(item.id)}
                        style={{ background: '#ffb700', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: '#64748b', display: 'flex' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem',
                      color: '#f1f5f9', marginBottom: '6px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.name}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.67rem', padding: '2px 9px', borderRadius: '10px', fontWeight: 700, background: catStyle.bg, color: catStyle.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {item.category}
                    </span>
                    <span style={{ fontSize: '0.67rem', color: '#475569' }}>
                      {item.type?.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.67rem', color: '#475569' }}>
                      {new Date(item.uploadedAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  {/* Action buttons — wide & easy to tap */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {onSelect && item.type === 'image' && (
                      <button
                        onClick={() => { onSelect(item.dataUrl); onClose(); }}
                        style={{
                          flex: 1, minWidth: '80px',
                          background: 'linear-gradient(135deg, #ffb700, #ff8c00)',
                          border: 'none', borderRadius: '8px',
                          padding: '8px 14px', cursor: 'pointer',
                          fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                          fontSize: '0.78rem', color: '#000', letterSpacing: '0.03em',
                          transition: 'all 0.18s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = ''}
                      >
                        ✓ Use This
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(item)}
                      style={{
                        padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px',
                        fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', fontWeight: 600,
                        transition: 'all 0.18s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,183,0,0.4)'; e.currentTarget.style.color = '#ffb700'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94a3b8'; }}
                    >
                      <Edit3 size={13} /> Rename
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{
                        padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px',
                        fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', fontWeight: 600,
                        transition: 'all 0.18s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Toast notification */}
        {toast && (
          <div style={{
            position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
            background: toast.type === 'danger' ? '#ef4444' : '#10b981',
            color: '#fff', padding: '9px 22px', borderRadius: '24px',
            fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '0.82rem',
            boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap', pointerEvents: 'none',
            animation: 'toastFadeInUp 0.3s ease',
          }}>
            {toast.msg}
          </div>
        )}
      </div>
    </>
  );

  // Use a React portal so the panel always renders at document.body level
  // This guarantees it's never trapped inside a lower stacking context
  if (typeof document === 'undefined') return null;
  return createPortal(panel, document.body);
}
