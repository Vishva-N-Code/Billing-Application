import { useRef, useState } from 'react';
import { FileDown, Image, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function ExportButtons({ targetRef, filename = 'document', onExport }) {
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

  const exportPDF = async () => {
    setExporting(true);
    try {
      const canvas = await getCanvas();
      if (!canvas) return;
      
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

      pdf.save(`${filename}.pdf`);
      if (onExport) onExport();
    } catch (err) {
      console.error('PDF export error:', err);
    }
    setExporting(false);
  };

  const exportJPG = async () => {
    setExporting(true);
    try {
      const canvas = await getCanvas();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `${filename}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
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

  return (
    <div className="export-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <button className="btn btn-primary" onClick={exportPDF} disabled={exporting}>
        <FileDown size={16} />
        {exporting ? 'Exporting...' : 'Export PDF'}
      </button>
      <button className="btn btn-secondary" onClick={exportJPG} disabled={exporting}>
        <Image size={16} />
        {exporting ? 'Exporting...' : 'Export JPG'}
      </button>
      <button className="btn btn-secondary" onClick={handlePrint} disabled={exporting}>
        <Printer size={16} />
        Print
      </button>
    </div>
  );
}
