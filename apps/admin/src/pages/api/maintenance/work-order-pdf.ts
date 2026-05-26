import type { APIRoute } from 'astro';
import { sql, getClient } from '@zyntel/db';
import { generateWorkOrderPdf } from '../../../lib/work-order-pdf.ts';

export const GET: APIRoute = async ({ url, request }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = new URL(request.url).origin;

    let clientBranding: { headerName?: string | null; footerText?: string | null } | null = null;
    try {
      const rows = await sql`
        SELECT sc.invoice_client_id
        FROM work_orders wo
        JOIN service_clients sc ON sc.id = wo.service_client_id
        WHERE wo.id = ${id} LIMIT 1
      `;
      const invoiceClientId = (rows[0] as any)?.invoice_client_id;
      if (invoiceClientId) {
        const client = await getClient(Number(invoiceClientId));
        if (client?.pdf_header_name || client?.pdf_footer_text) {
          clientBranding = { headerName: client.pdf_header_name, footerText: client.pdf_footer_text };
        }
      }
    } catch { /* branding is optional — proceed without it */ }

    const pdfBytes = await generateWorkOrderPdf({ workOrderId: id, baseUrl, clientBranding });

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="work-order.pdf"`,
      },
    });
  } catch (err: any) {
    const status = err.message === 'Work order not found' ? 404 : 500;
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
