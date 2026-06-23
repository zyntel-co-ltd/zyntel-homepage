import type { APIRoute } from 'astro';
import {
  getCaseStudies,
  getCaseStudyById,
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy,
} from '../../../lib/reports.ts';

export const GET: APIRoute = async ({ url }) => {
  try {
    const serviceClientId = url.searchParams.get('serviceClientId');
    const id = url.searchParams.get('id');

    if (id) {
      const study = await getCaseStudyById(id);
      if (!study) {
        return new Response(JSON.stringify({ error: 'Case study not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(study), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!serviceClientId) {
      return new Response(JSON.stringify({ error: 'serviceClientId or id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const studies = await getCaseStudies(serviceClientId);
    return new Response(JSON.stringify(studies), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { serviceClientId, title, markdownContent, summary, tags, status } = body as {
      serviceClientId?: string;
      title?: string;
      markdownContent?: string;
      summary?: string | null;
      tags?: string[];
      status?: 'draft' | 'published';
    };

    if (!serviceClientId || !title || !markdownContent) {
      return new Response(JSON.stringify({ error: 'serviceClientId, title, and markdownContent are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const study = await createCaseStudy({
      serviceClientId,
      title,
      markdownContent,
      summary: summary ?? null,
      tags: tags ?? [],
      status: status ?? 'draft',
    });

    return new Response(JSON.stringify(study), {
      status: 201,
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
    const { id, title, markdownContent, summary, tags, status, publishedAt } = body as {
      id?: string;
      title?: string;
      markdownContent?: string;
      summary?: string | null;
      tags?: string[];
      status?: 'draft' | 'published';
      publishedAt?: string | null;
    };

    if (!id) {
      return new Response(JSON.stringify({ error: 'id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updated = await updateCaseStudy(id, {
      ...(title !== undefined && { title }),
      ...(markdownContent !== undefined && { markdownContent }),
      ...(summary !== undefined && { summary }),
      ...(tags !== undefined && { tags }),
      ...(status !== undefined && { status }),
      ...(publishedAt !== undefined && { publishedAt: publishedAt ? new Date(publishedAt) : null }),
    });

    return new Response(JSON.stringify(updated), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    const statusCode = err.message === 'Case study not found' ? 404 : 500;
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
    await deleteCaseStudy(id);
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
