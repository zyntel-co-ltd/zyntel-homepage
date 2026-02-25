/**
 * Load image as base64 data URL and return dimensions for PDF
 */
async function loadImageForPdf(src: string): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src.startsWith('/') ? window.location.origin + src : src;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.drawImage(img, 0, 0);
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
}

export interface ExportPdfOptions {
  title?: string;
  headerLines?: string[];
  margin?: number;
  addFooter?: boolean;
}

/**
 * Export a DOM element as a PDF with charts/tables.
 * Adds header (period/filters), content, and footer with Zyntel logo.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  options?: ExportPdfOptions
): Promise<void> {
  const [html2canvas, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const { title, headerLines = [], margin = 10, addFooter = true } = options ?? {};
  const canvas = await html2canvas.default(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });
  const imgData = canvas.toDataURL('image/png', 1.0);
  const imgW = canvas.width;
  const imgH = canvas.height;
  const pdf = new jsPDF({
    orientation: imgW > imgH ? 'l' : 'p',
    unit: 'mm',
    format: 'a4',
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  let contentTop = margin;
  if (title || headerLines.length) {
    pdf.setFontSize(14);
    pdf.setTextColor(50, 50, 50);
    if (title) {
      pdf.setFontSize(16);
      pdf.text(title, margin, contentTop);
      contentTop += 7;
    }
    headerLines.forEach((line) => {
      pdf.setFontSize(10);
      pdf.text(line, margin, contentTop);
      contentTop += 5;
    });
    contentTop += 3;
  }

  const footerH = addFooter ? 15 : margin;
  const contentW = pageW - 2 * margin;
  const contentH = pageH - contentTop - footerH;
  const ratio = Math.min(contentW / imgW, contentH / imgH);
  const drawW = imgW * ratio;
  const drawH = imgH * ratio;
  const x = margin + (contentW - drawW) / 2;
  pdf.addImage(imgData, 'PNG', x, contentTop, drawW, drawH);

  if (addFooter) {
    try {
      const { dataUrl, width: imgW, height: imgH } = await loadImageForPdf('/images/zyntel_no_background.png');
      const targetH = 20;
      const logoW = (imgW / imgH) * targetH;
      const logoH = targetH;
      pdf.addImage(dataUrl, 'PNG', margin, pageH - margin - logoH, logoW, logoH);
    } catch {
      // ignore if image load fails
    }
  }

  pdf.save(filename || 'export.pdf');
}

/** Build filename-safe segment from filters */
export function buildExportFilename(prefix: string, parts: string[]): string {
  const date = new Date().toISOString().slice(0, 10);
  const safe = parts.filter(Boolean).join('-').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 60);
  return safe ? `${prefix}-${safe}-${date}.pdf` : `${prefix}-${date}.pdf`;
}
