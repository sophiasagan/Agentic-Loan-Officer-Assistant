from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

import aiosqlite
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException

from ..agent.graph import loan_agent
from ..agent.state import AgentState
from .schemas import (
    HistoryRecord,
    LoanAnalysisRequest,
    LoanAnalysisResponse,
    LoanHistoryResponse,
)

load_dotenv()

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

_DB_PATH = Path(os.getenv("LOAN_DB_PATH", str(Path(__file__).parent.parent / "loan_history.db")))

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS loan_analyses (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id        TEXT    NOT NULL,
    loan_type        TEXT    NOT NULL,
    loan_amount      REAL    NOT NULL,
    term_months      INTEGER NOT NULL,
    approved         INTEGER NOT NULL,
    churn_risk       TEXT    NOT NULL,
    dti_projected    REAL    NOT NULL,
    policy_violations TEXT   NOT NULL,
    conditions       TEXT    NOT NULL,
    narrative        TEXT    NOT NULL,
    processing_steps TEXT    NOT NULL,
    analyzed_at      TEXT    NOT NULL
);
"""

_CREATE_INDEX = """
CREATE INDEX IF NOT EXISTS idx_member_analyzed
    ON loan_analyses (member_id, analyzed_at DESC);
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(_CREATE_TABLE)
        await db.execute(_CREATE_INDEX)
        await db.commit()
    yield


app = FastAPI(
    title="CU Loan Officer Agent",
    description="Agentic loan analysis backed by Claude + LangGraph.",
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_processing_steps(messages: list[dict]) -> list[str]:
    """Return tool names in the order they were called across the conversation."""
    steps: list[str] = []
    for msg in messages:
        if msg.get("role") != "assistant":
            continue
        content = msg.get("content", [])
        if not isinstance(content, list):
            continue
        for block in content:
            if isinstance(block, dict) and block.get("type") == "tool_use":
                steps.append(block["name"])
    return steps


def _safe(state: AgentState, *keys, default=None):
    """Safely drill into nested state dicts."""
    obj = state
    for k in keys:
        if obj is None or not isinstance(obj, dict):
            return default
        obj = obj.get(k, default)
    return obj if obj is not None else default


def _build_response(state: AgentState, term_months: int) -> LoanAnalysisResponse:
    decision = state.get("final_decision") or {}
    return LoanAnalysisResponse(
        member_id=state["member_id"],
        loan_type=state["loan_type"],
        loan_amount=state["loan_amount"],
        approved=bool(decision.get("approved", False)),
        churn_risk=_safe(state, "churn_data", "risk_level", default="unknown"),
        dti_projected=float(_safe(state, "dti_result", "projected_dti", default=0.0)),
        policy_violations=_safe(state, "policy_result", "violations", default=[]),
        conditions=decision.get("conditions", []),
        narrative=decision.get("risk_notes", ""),
        processing_steps=_extract_processing_steps(state["messages"]),
    )


async def _persist(
    resp: LoanAnalysisResponse,
    term_months: int,
    analyzed_at: str,
) -> None:
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO loan_analyses
                (member_id, loan_type, loan_amount, term_months, approved,
                 churn_risk, dti_projected, policy_violations, conditions,
                 narrative, processing_steps, analyzed_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                resp.member_id,
                resp.loan_type,
                resp.loan_amount,
                term_months,
                int(resp.approved),
                resp.churn_risk,
                resp.dti_projected,
                json.dumps(resp.policy_violations),
                json.dumps(resp.conditions),
                resp.narrative,
                json.dumps(resp.processing_steps),
                analyzed_at,
            ),
        )
        await db.commit()


def _row_to_record(row: aiosqlite.Row) -> HistoryRecord:
    (
        row_id, member_id, loan_type, loan_amount, term_months,
        approved, churn_risk, dti_projected, policy_violations,
        conditions, narrative, processing_steps, analyzed_at,
    ) = row
    return HistoryRecord(
        id=row_id,
        member_id=member_id,
        loan_type=loan_type,
        loan_amount=loan_amount,
        term_months=term_months,
        approved=bool(approved),
        churn_risk=churn_risk,
        dti_projected=dti_projected,
        policy_violations=json.loads(policy_violations),
        conditions=json.loads(conditions),
        narrative=narrative,
        processing_steps=json.loads(processing_steps),
        analyzed_at=analyzed_at,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.post("/loan/analyze", response_model=LoanAnalysisResponse)
async def analyze_loan(req: LoanAnalysisRequest) -> LoanAnalysisResponse:
    """Run the LangGraph loan officer agent and return a structured recommendation."""
    opening = (
        f"Please analyse a loan request. "
        f"Member ID: {req.member_id}. "
        f"Loan type: {req.loan_type}. "
        f"Requested amount: ${req.loan_amount:,.2f} over {req.term_months} months. "
        "Gather the member profile, churn risk, DTI, and policy check, "
        "then provide your recommendation."
    )

    initial_state: AgentState = {
        "member_id": req.member_id,
        "loan_type": req.loan_type,
        "loan_amount": req.loan_amount,
        "messages": [{"role": "user", "content": opening}],
        "member_data": None,
        "churn_data": None,
        "policy_result": None,
        "dti_result": None,
        "decision_draft": None,
        "final_decision": None,
    }

    try:
        final_state: AgentState = await asyncio.to_thread(loan_agent.invoke, initial_state)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Agent error: {exc}") from exc

    if final_state.get("final_decision") is None:
        raise HTTPException(status_code=500, detail="Agent completed without producing a decision.")

    resp = _build_response(final_state, req.term_months)
    analyzed_at = datetime.now(timezone.utc).isoformat()
    await _persist(resp, req.term_months, analyzed_at)
    return resp


@app.get("/loan/analyze/{member_id}/history", response_model=LoanHistoryResponse)
async def get_history(member_id: str) -> LoanHistoryResponse:
    """Return the last 5 loan analyses for a member."""
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT id, member_id, loan_type, loan_amount, term_months, approved,
                   churn_risk, dti_projected, policy_violations, conditions,
                   narrative, processing_steps, analyzed_at
            FROM loan_analyses
            WHERE member_id = ?
            ORDER BY analyzed_at DESC
            LIMIT 5
            """,
            (member_id,),
        )
        rows = await cursor.fetchall()

    records = [_row_to_record(tuple(row)) for row in rows]
    return LoanHistoryResponse(member_id=member_id, count=len(records), history=records)
