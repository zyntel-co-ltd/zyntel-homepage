import type { APIRoute } from 'astro';
import {
  getAllQuotes,
  createQuote,
  updateQuote,
  deleteQuote,
} from '../../../lib/quotes.ts';

export const GET: APIRoute = async () => {
  try {
    const quotes = await getAllQuotes();
    return new Response(JSON.stringify(quotes), {
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
    const body = await request.json();
    if (!body.title || !Array.isArray(body.lineItems)) {
      return new Response(JSON.stringify({ error: 'title and lineItems are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const quote = await createQuote(body);
    return new Response(JSON.stringify(quote), {
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

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return new Response(JSON.stringify({ error: 'id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const quote = await updateQuote(id, data);
    return new Response(JSON.stringify(quote), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    const status = err.message === 'Quote not found' ? 404 : 500;
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), {
      status,
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
    await deleteQuote(id);
    return new Response(JSON.stringify({ deleted: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
