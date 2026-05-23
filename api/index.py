"""
Vercel serverless entry point.

Vercel's Python runtime looks for a callable named `app` (or `handler`) in
files under the root-level api/ directory.  This module re-exports the FastAPI
application so Vercel can treat it as a serverless function.

Deployment notes
────────────────
• SQLite: Vercel's filesystem is read-only except /tmp.  Set the env var
      LOAN_DB_PATH=/tmp/loan_history.db
  in the Vercel dashboard.  Data is ephemeral per cold-start, so the history
  endpoint will be empty after each new deployment.  For persistent history,
  keep Railway as the backend host (see README § Deploying to Railway).

• Timeouts: the loan agent makes multiple sequential Anthropic API calls.
  Vercel Hobby caps functions at 10 s; Pro at 60 s; Enterprise at 300 s.
  Set maxDuration in vercel.json accordingly and upgrade your plan if needed.
"""

import sys
from pathlib import Path

# Make the repo root importable when Vercel runs from the api/ subdirectory.
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from cu_loan_agent.api.main import app  # noqa: E402  (import after sys.path patch)

__all__ = ["app"]
