import { useRef } from 'react';
import { Upload, X } from 'lucide-react';

export default function SignatureUpload({ signature, onSignatureChange }) {
  const fileRef = useRef(null);

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
    <div className="form-group">
      <label>Digital Signature (Optional)</label>
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
        <div className="sig-upload-area" onClick={() => fileRef.current.click()}>
          <Upload size={24} />
          <p>Click to upload signature</p>
        </div>
      )}
    </div>
  );
}
