import { useRef, useState } from 'react';
import { Upload, X, BookImage } from 'lucide-react';
import MediaLibraryPanel from './MediaLibraryPanel';

export default function SignatureUpload({ signature, onSignatureChange }) {
  const fileRef = useRef(null);
  const [showLibrary, setShowLibrary] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        onSignatureChange(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <div className="form-group">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ margin: 0 }}>Digital Signature (Optional)</label>
          <button
            type="button"
            onClick={() => setShowLibrary(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px', borderRadius: '7px', cursor: 'pointer',
              background: 'var(--accent-gold-light)', border: '1px solid rgba(255,183,0,0.4)',
              color: 'var(--accent-gold)', fontFamily: 'Outfit, sans-serif',
              fontWeight: 700, fontSize: '0.72rem',
              transition: 'all 0.2s',
            }}
            title="Pick from saved Official Documents"
          >
            <BookImage size={13} /> Pick from Library
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
        {signature ? (
          <div className="sig-upload-area" style={{ position: 'relative' }}>
            <div style={{ cursor: 'pointer' }} onClick={() => fileRef.current.click()}>
              <img src={signature} alt="Signature" />
              <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Click to change</p>
            </div>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSignatureChange(null); }}
              className="btn-icon"
              style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10, background: 'white', border: '1px solid #ccc', borderRadius: '50%' }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div
            className="sig-upload-area"
            onClick={() => fileRef.current.click()}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
          >
            <Upload size={24} />
            <p>Click to upload signature</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              or use "Pick from Library" above
            </p>
          </div>
        )}
      </div>

      {/* Library picker — opens without closing the current form */}
      <MediaLibraryPanel
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={(dataUrl) => {
          onSignatureChange(dataUrl);
          setShowLibrary(false);
        }}
      />
    </>
  );
}
