/**
 * Catch-all proxy route: /api/backend/* → BACKEND_URL/*
 *
 * The browser calls /api/backend/loan/analyze (same-origin → no CORS).
 * This server-side Next.js function forwards the request to the Python
 * backend. The backend never needs CORS headers.
 */
import { NextRequest, NextResponse } from 'next/server';

const BACKEND = (process.env.BACKEND_URL ?? '').replace(/\/$/, '');

type Ctx = { params: Promise<{ path: string[] }> };

function missingBackendUrl() {
  return NextResponse.json(
    {
      detail:
        'BACKEND_URL is not set. Add it to your Vercel environment variables ' +
        '(frontend project → Settings → Environment Variables) and redeploy.',
    },
    { status: 502 }
  );
}

export async function GET(req: NextRequest, ctx: Ctx) {
  if (!BACKEND) return missingBackendUrl();

  const { path } = await ctx.params;
  const url = `${BACKEND}/${path.join('/')}${req.nextUrl.search}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { detail: `Proxy fetch failed → ${url} : ${msg}` },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  if (!BACKEND) return missingBackendUrl();

  const { path } = await ctx.params;
  const url = `${BACKEND}/${path.join('/')}`;

  try {
    const body = await req.text();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { detail: `Proxy fetch failed → ${url} : ${msg}` },
      { status: 502 }
    );
  }
}
