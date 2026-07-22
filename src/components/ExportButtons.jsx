import { useRef, useState } from 'react';
import { FileDown, Image, Printer, Share2, Save, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

export default function ExportButtons({ targetRef, filename = 'document', onExport, onSaveOnly, clientMobile, clientName, grandTotal }) {
  const [exporting, setExporting] = useState(false);
  const [readyShare, setReadyShare] = useState(null);

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
    // Using a more generous delay for stability as requested by the user
    await new Promise(resolve => setTimeout(resolve, 600));
    
    try {
      const canvas = await html2canvas(el, {
        scale: 2.5, // Reduced slightly from 3 for better performance/memory stability
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 794,
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
      const canvas = await getCanvas();
      if (!canvas) { setExporting(false); return null; }
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfW = 210;
      const pdfH = 297;
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

      if (returnBlob) {
        setExporting(false);
        return pdf.output('blob');
      }

      const cleanName = sanitizeFilename(filename);
      pdf.save(`${cleanName}.pdf`);
      if (onExport) onExport();
    } catch (err) {
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
    const file = new File([blob], `${cleanName}.${extension}`, { type: mimeType });
    
    setReadyShare(null);

    // Try native sharing first (mobile browsers / supported desktop browsers)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: cleanName });
        if (onExport) onExport();
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.log('Native share failed, falling back to download/WhatsApp', err);
      }
    }

    // Fallback: Download file + open WhatsApp with prefilled client details
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${cleanName}.${extension}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    
    if (onExport) onExport();
    
    const clientHeader = clientName ? `Client: *${clientName}*\n` : '';
    const totalHeader = grandTotal ? `Total Amount: *₹${grandTotal.toLocaleString('en-IN')}*\n` : '';
    const msg = `*OM SARAVANA CRANES*\n\nDear Sir/Madam,\nHere is your *${cleanName}*.\n${clientHeader}${totalHeader}\nThank you for choosing OM SARAVANA CRANES.\nMobile: 9551076305 / 9551070705`;
    
    let phoneStr = '';
    if (clientMobile) {
      const cleanPhone = String(clientMobile).replace(/[^0-9]/g, '');
      if (cleanPhone.length >= 10) {
        phoneStr = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      }
    }

    const phoneParam = phoneStr ? `phone=${phoneStr}&` : '';
    const waProtocolUrl = `whatsapp://send?${phoneParam}text=${encodeURIComponent(msg)}`;
    const waWebUrl = `https://web.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(msg)}`;
    
    setTimeout(() => {
      window.location.href = waProtocolUrl;
      setTimeout(() => {
        if (document.visibilityState === 'visible') window.open(waWebUrl, '_blank');
      }, 2000);
    }, 300);
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
         setReadyShare({ format, blob });
      }
    } catch (e) {
      console.error('Share preparation failed', e);
    }
    setExporting(false);
  };

  return (
    <div className="export-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
      {onSaveOnly && (
        <button className="btn btn-primary" onClick={onSaveOnly} disabled={exporting} style={{ background: '#4CAF50', borderColor: '#4CAF50' }}>
          <Save size={16} />
          Save to App
        </button>
      )}
      
      <button className="btn btn-secondary" onClick={handlePrint} disabled={exporting}>
        <Printer size={16} />
        Print
      </button>

      <button 
        className="btn btn-primary" 
        onClick={() => shareDocument('pdf')} 
        disabled={exporting} 
        style={{ 
          background: readyShare?.format === 'pdf' ? '#fff' : '#25D366', 
          color: readyShare?.format === 'pdf' ? '#000' : '#fff', 
          borderColor: '#25D366',
          minWidth: '160px'
        }}
      >
        {exporting ? <Loader2 size={16} className="spin" /> : <Share2 size={16} />}
        {exporting ? 'Generating...' : readyShare?.format === 'pdf' ? 'Click to Send PDF' : 'Share PDF'}
      </button>

      <button 
        className="btn btn-primary" 
        onClick={() => shareDocument('jpg')} 
        disabled={exporting} 
        style={{ 
          background: readyShare?.format === 'jpg' ? '#fff' : '#128C7E', 
          color: readyShare?.format === 'jpg' ? '#000' : '#fff', 
          borderColor: '#128C7E',
          minWidth: '160px'
        }}
      >
        {exporting ? <Loader2 size={16} className="spin" /> : <Share2 size={16} />}
        {exporting ? 'Generating...' : readyShare?.format === 'jpg' ? 'Click to Send JPG' : 'Share JPG'}
      </button>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
