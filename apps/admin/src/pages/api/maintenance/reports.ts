import type { APIRoute } from 'astro';
import {
  getQuarterlyReports,
  getQuarterlyReportById,
  updateQuarterlyReport,
  deleteQuarterlyReport,
} from '../../../lib/reports.ts';

export const GET: APIRoute = async ({ url }) => {
  try {
    const serviceClientId = url.searchParams.get('serviceClientId');
    const id = url.searchParams.get('id');

    if (id) {
      const report = await getQuarterlyReportById(id);
      if (!report) {
        return new Response(JSON.stringify({ error: 'Report not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(report), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!serviceClientId) {
      return new Response(JSON.stringify({ error: 'serviceClientId or id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reports = await getQuarterlyReports(serviceClientId);
    return new Response(JSON.stringify(reports), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { id, title, markdownContent, pdfUrl, status } = body as {
      id?: string;
      title?: string;
      markdownContent?: string;
      pdfUrl?: string | null;
      status?: 'draft' | 'final';
    };

    if (!id) {
      return new Response(JSON.stringify({ error: 'id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updated = await updateQuarterlyReport(id, {
      ...(title !== undefined && { title }),
      ...(markdownContent !== undefined && { markdownContent }),
      ...(pdfUrl !== undefined && { pdfUrl }),
      ...(status !== undefined && { status }),
    });

    return new Response(JSON.stringify(updated), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    const statusCode = err.message === 'Report not found' ? 404 : 500;
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    await deleteQuarterlyReport(id);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
