import type { APIRoute } from 'astro';
import { generateMaintenanceReportPdf } from '../../../lib/maintenance-report-pdf.ts';

export const GET: APIRoute = async ({ url }) => {
  try {
    const clientId = url.searchParams.get('clientId');
    const quarter = url.searchParams.get('quarter') as 'Q1' | 'Q2' | 'Q3' | 'Q4' | null;
    const year = url.searchParams.get('year');

    if (!clientId || !quarter || !year) {
      return new Response(JSON.stringify({ error: 'clientId, quarter, and year required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      return new Response(JSON.stringify({ error: 'quarter must be Q1, Q2, Q3, or Q4' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const baseUrl = import.meta.env.SITE_URL ?? import.meta.env.SITE ?? 'https://admin.zyntel.net';
    const pdfBytes = await generateMaintenanceReportPdf({
      serviceClientId: clientId,
      quarter,
      year: Number(year),
      baseUrl,
    });

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="maintenance-report-${quarter}-${year}.pdf"`,
      },
    });
  } catch (err: any) {
    const status = err.message === 'Service client not found' ? 404 : 500;
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
