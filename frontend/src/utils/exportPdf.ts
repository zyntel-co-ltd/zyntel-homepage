/**
 * Export a DOM element as a PDF with charts/tables.
 * Uses html2canvas + jspdf for high-quality output.
 * Run `npm install` in frontend to ensure jspdf and html2canvas are installed.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  options?: { title?: string; margin?: number }
): Promise<void> {
  const [html2canvas, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const { title, margin = 10 } = options ?? {};
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
  const contentTop = title ? 18 : margin;
  const contentW = pageW - 2 * margin;
  const contentH = pageH - contentTop - margin;
  const ratio = Math.min(contentW / imgW, contentH / imgH);
  const drawW = imgW * ratio;
  const drawH = imgH * ratio;
  const x = margin + (contentW - drawW) / 2;
  if (title) {
    pdf.setFontSize(16);
    pdf.text(title, margin, 12);
  }
  pdf.addImage(imgData, 'PNG', x, contentTop, drawW, drawH);
  pdf.save(filename || 'export.pdf');
}
