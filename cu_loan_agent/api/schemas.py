from __future__ import annotations

from pydantic import BaseModel, Field


class LoanAnalysisRequest(BaseModel):
    member_id: str
    loan_type: str
    loan_amount: float = Field(gt=0)
    term_months: int = Field(gt=0)


class LoanAnalysisResponse(BaseModel):
    member_id: str
    loan_type: str
    loan_amount: float
    approved: bool
    churn_risk: str
    dti_projected: float
    policy_violations: list[str]
    conditions: list[str]
    narrative: str
    processing_steps: list[str]


class HistoryRecord(BaseModel):
    id: int
    member_id: str
    loan_type: str
    loan_amount: float
    term_months: int
    approved: bool
    churn_risk: str
    dti_projected: float
    policy_violations: list[str]
    conditions: list[str]
    narrative: str
    processing_steps: list[str]
    analyzed_at: str


class LoanHistoryResponse(BaseModel):
    member_id: str
    count: int
    history: list[HistoryRecord]
