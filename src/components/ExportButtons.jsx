import { useRef, useState } from 'react';
import { FileDown, Image, Printer, Share2, Save, Loader2, Check } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

export default function ExportButtons({ targetRef, filename = 'document', onExport, onSaveOnly, clientMobile, clientName, grandTotal }) {
  const [exporting, setExporting] = useState(false);
  const [readyShare, setReadyShare] = useState(null);
  const [showDesktopWhatsAppModal, setShowDesktopWhatsAppModal] = useState(null);

  const sanitizeFilename = (name) => {
    return name.replace(/[<>:"/\\|?*]/g, '').trim() || 'document';
  };

  const getCanvas = async () => {
    if (!targetRef.current) return null;
    const el = targetRef.current;
    
    // Apply global capture class
    document.body.classList.add('exporting-pdf');
    
    // Explicitly force A4 dimensions on the target element for the capture duration
    const originalStyle = el.style.cssText;
    el.style.width = '794px';
    el.style.minHeight = '1123px';
    el.style.margin = '0';
    el.style.transform = 'none';

    // Wait for the browser to apply styles and ensure all images/fonts are rendered
    await new Promise(resolve => setTimeout(resolve, 600));
    
    try {
      const canvas = await html2canvas(el, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 794,
        windowWidth: 1200,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
      });
      
      // Restore styles and cleanup
      el.style.cssText = originalStyle;
      document.body.classList.remove('exporting-pdf');
      return canvas;
    } catch (err) {
      el.style.cssText = originalStyle;
      document.body.classList.remove('exporting-pdf');
      console.error('Capture error:', err);
      return null;
    }
  };

  const exportPDF = async (returnBlob = false) => {
    setExporting(true);
    try {
      if (!targetRef.current) { setExporting(false); return null; }
      const el = targetRef.current;
      const previewPages = Array.from(el.querySelectorAll('.doc-preview'));

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = 210;
      const pdfH = 297;

      if (previewPages.length > 1) {
        document.body.classList.add('exporting-pdf');
        await new Promise(resolve => setTimeout(resolve, 400));

        for (let i = 0; i < previewPages.length; i++) {
          const pageEl = previewPages[i];
          const canvas = await html2canvas(pageEl, {
            scale: 2.5,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: 794,
            windowWidth: 1200,
            allowTaint: true,
            scrollX: 0,
            scrollY: 0,
          });

          if (canvas) {
            const pageImgData = canvas.toDataURL('image/jpeg', 0.95);
            if (i > 0) pdf.addPage();
            pdf.addImage(pageImgData, 'JPEG', 0, 0, pdfW, pdfH);
          }
        }
        document.body.classList.remove('exporting-pdf');
      } else {
        const canvas = await getCanvas();
        if (!canvas) { setExporting(false); return null; }
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgW = canvas.width;
        const imgH = canvas.height;
        const ratio = pdfW / imgW;
        const totalH_mm = imgH * ratio;

        let heightLeft = totalH_mm;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'JPEG', 0, position, pdfW, totalH_mm);
        heightLeft -= pdfH;

        // Add subsequent pages if content overflows
        while (heightLeft > 0) {
          position -= pdfH;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfW, totalH_mm);
          heightLeft -= pdfH;
        }
      }

      if (returnBlob) {
        setExporting(false);
        return pdf.output('blob');
      }

      const cleanName = sanitizeFilename(filename);
      pdf.save(`${cleanName}.pdf`);
      if (onExport) onExport();
    } catch (err) {
      document.body.classList.remove('exporting-pdf');
      console.error('PDF export error:', err);
    }
    setExporting(false);
  };

  const exportJPG = async (returnBlob = false) => {
    setExporting(true);
    try {
      const canvas = await getCanvas();
      if (!canvas) { setExporting(false); return null; }
      
      const imgW = canvas.width;
      const targetH = Math.max(canvas.height, imgW * 1.4142);
      
      const a4Canvas = document.createElement('canvas');
      a4Canvas.width = imgW;
      a4Canvas.height = targetH;
      const ctx = a4Canvas.getContext('2d');
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, a4Canvas.width, a4Canvas.height);
      ctx.drawImage(canvas, 0, 0);

      const dataUrl = a4Canvas.toDataURL('image/jpeg', 0.95);
      
      if (returnBlob) {
        const res = await fetch(dataUrl);
        setExporting(false);
        return await res.blob();
      }

      const cleanName = sanitizeFilename(filename);
      const link = document.createElement('a');
      link.download = `${cleanName}.jpg`;
      link.href = dataUrl;
      link.click();
      if (onExport) onExport();
    } catch (err) {
      console.error('JPG export error:', err);
    }
    setExporting(false);
  };

  const handlePrint = () => {
    window.print();
    if (onExport) onExport();
  };

  const executeShare = async (blob, format) => {
    const cleanName = sanitizeFilename(filename);
    const extension = format === 'pdf' ? 'pdf' : 'jpg';
    const mimeType = format === 'pdf' ? 'application/pdf' : 'image/jpeg';
    const file = new File([blob], `${cleanName}.${extension}`, { type: mimeType, lastModified: Date.now() });
    
    setReadyShare(null);

    // 1. Try native Web Share API with file attachment (Mobile / supported devices)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        // IMPORTANT: Do NOT include title or text when sharing files to WhatsApp.
        // WhatsApp on Android converts shares with title/text to plain text messages and drops the file!
        await navigator.share({ files: [file] });
        if (onExport) onExport();
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.log('Native share failed or dismissed, proceeding with download', err);
      }
    }

    // 2. Desktop fallback: Download the file and provide WhatsApp Web instructions
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${cleanName}.${extension}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    
    if (onExport) onExport();

    setShowDesktopWhatsAppModal({
      filename: `${cleanName}.${extension}`,
      format: format.toUpperCase()
    });
  };

  const shareDocument = async (format) => {
    if (readyShare && readyShare.format === format) {
      executeShare(readyShare.blob, format);
      return;
    }
    setExporting(true);
    try {
      let blob = null;
      if (format === 'pdf') blob = await exportPDF(true);
      else blob = await exportJPG(true);

      if (blob) {
        const cleanName = sanitizeFilename(filename);
        const extension = format === 'pdf' ? 'pdf' : 'jpg';
        const mimeType = format === 'pdf' ? 'application/pdf' : 'image/jpeg';
        const file = new File([blob], `${cleanName}.${extension}`, { type: mimeType, lastModified: Date.now() });

        // If desktop browser without native file share, execute immediately without 2-step click
        if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
          executeShare(blob, format);
        } else {
          // Mobile: attempt direct share, or fall back to ready state if gesture expired
          try {
            await navigator.share({ files: [file] });
            if (onExport) onExport();
          } catch (shareErr) {
            if (shareErr.name !== 'AbortError') {
              setReadyShare({ format, blob });
            }
          }
        }
      }
    } catch (e) {
      console.error('Share preparation failed', e);
    }
    setExporting(false);
  };

  return (
    <div className="export-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
      {onSaveOnly && (
        <button 
          className="btn btn-primary" 
          onClick={onSaveOnly} 
          disabled={exporting} 
          style={{ background: '#4CAF50', borderColor: '#4CAF50' }}
        >
          <Save size={16} />
          Save to App
        </button>
      )}

      <button 
        className="btn btn-primary" 
        onClick={() => exportPDF(false)} 
        disabled={exporting}
        style={{ background: '#0284c7', borderColor: '#0284c7', color: '#fff' }}
        title="Download high-quality PDF document"
      >
        <FileDown size={16} />
        Download PDF
      </button>

      <button 
        className="btn btn-secondary" 
        onClick={() => exportJPG(false)} 
        disabled={exporting}
        title="Download JPG image"
      >
        <Image size={16} />
        Download JPG
      </button>

      <button 
        className="btn btn-primary" 
        onClick={() => shareDocument('pdf')} 
        disabled={exporting} 
        style={{ 
          background: readyShare?.format === 'pdf' ? '#fff' : '#25D366', 
          color: readyShare?.format === 'pdf' ? '#000' : '#fff', 
          borderColor: '#25D366',
          fontWeight: 600
        }}
        title="Share PDF directly to WhatsApp"
      >
        {exporting ? <Loader2 size={16} className="spin" /> : <Share2 size={16} />}
        {exporting ? 'Generating...' : readyShare?.format === 'pdf' ? 'Click to Send PDF' : 'Share PDF on WhatsApp'}
      </button>

      <button 
        className="btn btn-secondary" 
        onClick={() => shareDocument('jpg')} 
        disabled={exporting} 
        style={{ 
          borderColor: '#128C7E', 
          color: '#128C7E',
          fontWeight: 600
        }}
        title="Share JPG image preview on WhatsApp"
      >
        {exporting ? <Loader2 size={16} className="spin" /> : <Share2 size={16} />}
        {exporting ? 'Generating...' : readyShare?.format === 'jpg' ? 'Click to Send JPG' : 'Share JPG on WhatsApp'}
      </button>

      <button className="btn btn-secondary" onClick={handlePrint} disabled={exporting}>
        <Printer size={16} />
        Print
      </button>

      {/* Desktop WhatsApp Web Guidance Modal */}
      {showDesktopWhatsAppModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card, #1e293b)',
            color: 'var(--text-main, #fff)',
            borderRadius: '12px',
            padding: '28px 24px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📄</div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', fontWeight: 600 }}>
              {showDesktopWhatsAppModal.format} Downloaded to Your Device!
            </h3>
            <p style={{ fontSize: '0.925rem', lineHeight: '1.5', color: 'var(--text-muted, #94a3b8)', margin: '0 0 24px 0' }}>
              Web browsers cannot automatically attach files directly into WhatsApp Web. We have downloaded <strong>{showDesktopWhatsAppModal.filename}</strong> to your computer.
              <br /><br />
              Please open WhatsApp and drag & drop the downloaded file (or click <strong>📎 Attach Document</strong>) into your chat.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                style={{ background: '#25D366', borderColor: '#25D366', color: '#fff', padding: '10px 20px', fontWeight: 600 }}
                onClick={() => {
                  const cleanPhone = clientMobile ? String(clientMobile).replace(/[^0-9]/g, '') : '';
                  const phoneStr = cleanPhone.length >= 10 ? (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone) : '';
                  const phoneParam = phoneStr ? `phone=${phoneStr}&` : '';
                  const waWebUrl = `https://web.whatsapp.com/send?${phoneParam}`;
                  window.open(waWebUrl, '_blank');
                  setShowDesktopWhatsAppModal(null);
                }}
              >
                Open WhatsApp Web
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '10px 20px' }}
                onClick={() => setShowDesktopWhatsAppModal(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
