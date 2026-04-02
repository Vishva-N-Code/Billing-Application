import { useRef, useState } from 'react';
import { FileDown, Image, Printer, Share2, Save } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function ExportButtons({ targetRef, filename = 'document', onExport, onSaveOnly }) {
  const [exporting, setExporting] = useState(false);

  const getCanvas = async () => {
    if (!targetRef.current) return null;
    return html2canvas(targetRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
  };

  const exportPDF = async (returnBlob = false) => {
    setExporting(true);
    try {
      const canvas = await getCanvas();
      if (!canvas) { setExporting(false); return null; }
      
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth(); // 210
      const pdfH = pdf.internal.pageSize.getHeight(); // 297
      
      const imgW = canvas.width;
      const imgH = canvas.height;
      
      // Calculate scale ratio to fit the entire canvas precisely into one A4 page
      const ratio = Math.min(pdfW / imgW, pdfH / imgH);
      const outputW = imgW * ratio;
      const outputH = imgH * ratio;

      // Center it horizontally
      const xOffset = (pdfW - outputW) / 2;

      pdf.addImage(imgData, 'JPEG', xOffset, 0, outputW, outputH);

      if (returnBlob) {
        setExporting(false);
        return pdf.output('blob');
      }

      pdf.save(`${filename}.pdf`);
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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      if (returnBlob) {
        const res = await fetch(dataUrl);
        setExporting(false);
        return await res.blob();
      }

      const link = document.createElement('a');
      link.download = `${filename}.jpg`;
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

  const shareDocument = async (format) => {
    setExporting(true);
    try {
      let blob = null;
      let extension = '';
      let mimeType = '';

      if (format === 'pdf') {
        blob = await exportPDF(true);
        extension = 'pdf';
        mimeType = 'application/pdf';
      } else {
        blob = await exportJPG(true);
        extension = 'jpg';
        mimeType = 'image/jpeg';
      }

      if (!blob) {
         setExporting(false);
         return;
      }
      
      const file = new File([blob], `${filename}.${extension}`, { type: mimeType });
      const msg = `Here is the document: ${filename}. Please attach the downloaded file.`;

      // 1. Try Native Web Share API first. It attaches the file natively if supported!
      // This is the absolute best way to directly share a file to WhatsApp on devices that support it.
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: filename,
            text: msg
          });
          if (onExport) onExport();
          setExporting(false);
          return; // Success! Done.
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
             setExporting(false);
             return;
          }
          console.log('Native share failed, falling back to manual WA navigation', shareErr);
        }
      }

      // 2. Fallback: Download the file, then open WhatsApp protocol without a phone number
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${filename}.${extension}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      if (onExport) onExport();

      // IMPORTANT: Remove the phone parameter so WhatsApp asks the user who to send it to
      const waProtocolUrl = `whatsapp://send?text=${encodeURIComponent(msg)}`;
      const waWebUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

      setTimeout(() => {
        window.location.href = waProtocolUrl;
        setTimeout(() => {
          if (document.visibilityState === 'visible') {
            window.location.href = waWebUrl;
          }
        }, 2000);
      }, 300);

    } catch (e) {
      console.error('Share execution failed', e);
    }
    setExporting(false);
  };

  return (
    <>
      <div className="export-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
      <button className="btn btn-primary" onClick={() => shareDocument('pdf')} disabled={exporting} style={{ background: '#25D366', borderColor: '#25D366' }}>
        <Share2 size={16} />
        {exporting ? '...' : 'Share PDF'}
      </button>
      <button className="btn btn-primary" onClick={() => shareDocument('jpg')} disabled={exporting} style={{ background: '#128C7E', borderColor: '#128C7E' }}>
        <Share2 size={16} />
        {exporting ? '...' : 'Share JPG'}
      </button>
    </div>
    </>
  );
}
