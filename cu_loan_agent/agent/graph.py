from __future__ import annotations

import json
import os
import re

import anthropic
from dotenv import load_dotenv
from langgraph.graph import END, StateGraph

from .state import AgentState
from .tools import TOOLS, dispatch_tool

load_dotenv()

_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
_MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = (
    "You are a credit union loan officer assistant. "
    "Given a member ID and loan request, gather all needed information using your tools, "
    "then draft a structured loan recommendation. "
    "Always check DTI and lending policy."
)

_DECISION_REQUEST = (
    "Based on all the information you have gathered, provide your final loan recommendation "
    "as a JSON object with exactly these fields:\n"
    "{\n"
    '  "approved": <bool>,\n'
    '  "conditions": <list of strings — empty list if none>,\n'
    '  "risk_notes": <string summarising key risk factors>,\n'
    '  "suggested_rate": <float — APR as a percentage, e.g. 6.75>\n'
    "}\n\n"
    "Reply with the JSON object only. No prose, no markdown fences."
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _block_to_dict(block) -> dict:
    """Normalise an Anthropic SDK content-block object or dict to a plain dict."""
    if isinstance(block, dict):
        return block
    return block.model_dump()


def _last_assistant_tool_uses(state: AgentState) -> list[dict]:
    """Return all tool_use blocks from the last assistant message, as dicts."""
    last = state["messages"][-1]
    if last.get("role") != "assistant":
        return []
    content = last.get("content", [])
    if isinstance(content, str):
        return []
    return [b for b in content if isinstance(b, dict) and b.get("type") == "tool_use"]


# ---------------------------------------------------------------------------
# Node: call_llm
# ---------------------------------------------------------------------------

def call_llm(state: AgentState) -> dict:
    response = _client.messages.create(
        model=_MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        tools=TOOLS,
        messages=state["messages"],
    )
    assistant_content = [_block_to_dict(b) for b in response.content]
    return {"messages": [{"role": "assistant", "content": assistant_content}]}


# ---------------------------------------------------------------------------
# Routing: does the last assistant message contain any tool_use blocks?
# ---------------------------------------------------------------------------

def _route_after_llm(state: AgentState) -> str:
    return "run_tools" if _last_assistant_tool_uses(state) else "draft_decision"


# ---------------------------------------------------------------------------
# Node: run_tools
# ---------------------------------------------------------------------------

def run_tools(state: AgentState) -> dict:
    tool_uses = _last_assistant_tool_uses(state)

    tool_result_blocks: list[dict] = []
    state_updates: dict = {}

    for block in tool_uses:
        tool_name: str = block["name"]
        tool_input: dict = block["input"]
        tool_use_id: str = block["id"]

        result = dispatch_tool(tool_name, tool_input)

        # Mirror result into dedicated state fields for downstream nodes.
        if tool_name == "get_member_profile":
            state_updates["member_data"] = result
        elif tool_name == "get_churn_risk":
            state_updates["churn_data"] = result
        elif tool_name == "check_lending_policy":
            state_updates["policy_result"] = result
        elif tool_name == "calculate_dti":
            state_updates["dti_result"] = result

        tool_result_blocks.append(
            {
                "type": "tool_result",
                "tool_use_id": tool_use_id,
                "content": json.dumps(result),
            }
        )

    state_updates["messages"] = [{"role": "user", "content": tool_result_blocks}]
    return state_updates


# ---------------------------------------------------------------------------
# Node: draft_decision
# ---------------------------------------------------------------------------

def draft_decision(state: AgentState) -> dict:
    decision_prompt: dict = {"role": "user", "content": _DECISION_REQUEST}

    response = _client.messages.create(
        model=_MODEL,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        # No tools — we want a plain JSON reply, not another tool-calling loop.
        messages=state["messages"] + [decision_prompt],
    )

    raw: str = response.content[0].text.strip()

    try:
        decision = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        decision = json.loads(match.group()) if match else {"raw": raw}

    assistant_reply = [_block_to_dict(b) for b in response.content]
    return {
        "decision_draft": decision,
        "final_decision": decision,
        "messages": [
            decision_prompt,
            {"role": "assistant", "content": assistant_reply},
        ],
    }


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------

def _build_graph() -> StateGraph:
    g = StateGraph(AgentState)

    g.add_node("call_llm", call_llm)
    g.add_node("run_tools", run_tools)
    g.add_node("draft_decision", draft_decision)

    g.set_entry_point("call_llm")

    g.add_conditional_edges(
        "call_llm",
        _route_after_llm,
        {
            "run_tools": "run_tools",
            "draft_decision": "draft_decision",
        },
    )
    g.add_edge("run_tools", "call_llm")
    g.add_edge("draft_decision", END)

    return g.compile()


loan_agent = _build_graph()


# ---------------------------------------------------------------------------
# Public helper — build the initial state and invoke the graph
# ---------------------------------------------------------------------------

def run_loan_analysis(
    member_id: str,
    loan_type: str,
    loan_amount: float,
) -> AgentState:
    """Convenience wrapper: constructs the opening user message and runs the graph."""
    opening_message = (
        f"Please analyse a loan request. "
        f"Member ID: {member_id}. "
        f"Loan type: {loan_type}. "
        f"Requested amount: ${loan_amount:,.2f}. "
        "Gather the member profile, churn risk, DTI, and policy check, "
        "then provide your recommendation."
    )

    initial_state: AgentState = {
        "member_id": member_id,
        "loan_type": loan_type,
        "loan_amount": loan_amount,
        "messages": [{"role": "user", "content": opening_message}],
        "member_data": None,
        "churn_data": None,
        "policy_result": None,
        "dti_result": None,
        "decision_draft": None,
        "final_decision": None,
    }

    return loan_agent.invoke(initial_state)
