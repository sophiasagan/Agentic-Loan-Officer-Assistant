import type {
  LoanAnalysisRequest,
  LoanAnalysisResponse,
  LoanHistoryResponse,
} from './types';

// All calls go through the Next.js proxy at /api/backend/*.
// The proxy forwards server-side to BACKEND_URL — no CORS needed in the browser.
const BASE = '/api/backend';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) {
        detail = typeof body.detail === 'string'
          ? body.detail
          : JSON.stringify(body.detail);
      }
    } catch {
      // ignore parse errors — use the status text
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function analyzeLoan(
  req: LoanAnalysisRequest
): Promise<LoanAnalysisResponse> {
  const res = await fetch(`${BASE}/loan/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return handleResponse<LoanAnalysisResponse>(res);
}

export async function getMemberHistory(
  memberId: string
): Promise<LoanHistoryResponse> {
  const res = await fetch(
    `${BASE}/loan/analyze/${encodeURIComponent(memberId)}/history`
  );
  return handleResponse<LoanHistoryResponse>(res);
}
