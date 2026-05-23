from __future__ import annotations

import operator
from typing import Annotated, TypedDict


class AgentState(TypedDict):
    member_id: str
    loan_type: str
    loan_amount: float
    # Append-only message list — each node returns {"messages": [new_msgs]} and
    # LangGraph merges them via operator.add rather than replacing the list.
    messages: Annotated[list[dict], operator.add]
    member_data: dict | None
    churn_data: dict | None
    policy_result: dict | None
    dti_result: dict | None
    decision_draft: dict | None
    final_decision: dict | None
