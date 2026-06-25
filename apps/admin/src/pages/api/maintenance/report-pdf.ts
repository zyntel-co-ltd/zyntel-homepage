import type { APIRoute } from 'astro';
import { generateClientSummaryPdf, generateMaintenanceReportPdf } from '../../../lib/maintenance-report-pdf.ts';
import { getQuarterlyReportById, getQuarterlyReportByPeriod } from '../../../lib/reports.ts';
import { getServiceClientById } from '../../../lib/maintenance.ts';
import type { ReportInput } from '../../../lib/reports.ts';

export const GET: APIRoute = async ({ url }) => {
  try {
    const baseUrl = import.meta.env.SITE_URL ?? import.meta.env.SITE ?? 'https://admin.zyntel.net';

    // Preferred path: reportId → use stored source_data (no re-fetch)
    const reportId = url.searchParams.get('reportId');
    if (reportId) {
      const report = await getQuarterlyReportById(reportId);
      if (!report) {
        return new Response(JSON.stringify({ error: 'Report not found' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      }
      const client = await getServiceClientById(report.serviceClientId);
      if (!client) {
        return new Response(JSON.stringify({ error: 'Service client not found' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      }

      let sourceData: ReportInput | null = report.sourceData as ReportInput | null;

      // Fall back to legacy live generation if source_data was not stored (older reports)
      if (!sourceData) {
        const pdfBytes = await generateMaintenanceReportPdf({
          serviceClientId: report.serviceClientId,
          quarter: report.quarter,
          year: report.year,
          baseUrl,
        });
        const filename = `${client.name.replace(/\s+/g, '-')}-${report.quarter}-${report.year}-summary.pdf`;
        return new Response(pdfBytes, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${filename}"`,
          },
        });
      }

      const pdfBytes = await generateClientSummaryPdf({ client, sourceData, baseUrl });
      const filename = `${client.name.replace(/\s+/g, '-')}-${report.quarter}-${report.year}-summary.pdf`;
      return new Response(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`,
        },
      });
    }

    // Legacy path: clientId + quarter + year
    const clientId = url.searchParams.get('clientId');
    const quarter = url.searchParams.get('quarter') as 'Q1' | 'Q2' | 'Q3' | 'Q4' | null;
    const year = url.searchParams.get('year');

    if (!clientId || !quarter || !year) {
      return new Response(
        JSON.stringify({ error: 'Provide reportId, or all of clientId + quarter + year' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      return new Response(JSON.stringify({ error: 'quarter must be Q1–Q4' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Try to use stored report's source_data first
    const storedReport = await getQuarterlyReportByPeriod(clientId, quarter, Number(year));
    if (storedReport?.sourceData) {
      const client = await getServiceClientById(clientId);
      if (!client) {
        return new Response(JSON.stringify({ error: 'Service client not found' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      }
      const pdfBytes = await generateClientSummaryPdf({
        client,
        sourceData: storedReport.sourceData as ReportInput,
        baseUrl,
      });
      const filename = `${client.name.replace(/\s+/g, '-')}-${quarter}-${year}-summary.pdf`;
      return new Response(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`,
        },
      });
    }

    // No stored data — generate fresh
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
      status, headers: { 'Content-Type': 'application/json' },
    });
  }
};
