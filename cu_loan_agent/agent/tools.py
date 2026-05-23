import os
import httpx
from dotenv import load_dotenv

load_dotenv()

# Empty string or missing var both mean "no churn service available".
_raw_churn_url = os.getenv("CHURN_API_URL", "").strip()
CHURN_API_URL: str | None = _raw_churn_url if _raw_churn_url.startswith("http") else None

# ---------------------------------------------------------------------------
# Synthetic member data store (stand-in for a real DB call)
# ---------------------------------------------------------------------------
_MEMBERS: dict[str, dict] = {
    "M001": {
        "name": "Maria Delgado",
        "tenure_years": 8,
        "product_count": 4,
        "monthly_income": 7200.00,
        "existing_loan_balances": {"auto": 18500.00, "personal": 0.0},
        "checking_balance": 3400.00,
        "savings_balance": 12000.00,
    },
    "M002": {
        "name": "James Okafor",
        "tenure_years": 2,
        "product_count": 2,
        "monthly_income": 4500.00,
        "existing_loan_balances": {"auto": 0.0, "personal": 5000.00},
        "checking_balance": 800.00,
        "savings_balance": 1500.00,
    },
    "M003": {
        "name": "Sandra Pham",
        "tenure_years": 15,
        "product_count": 6,
        "monthly_income": 11500.00,
        "existing_loan_balances": {"auto": 0.0, "personal": 0.0, "heloc": 45000.00},
        "checking_balance": 9200.00,
        "savings_balance": 55000.00,
    },
}

# Approximate monthly payment rate used to estimate existing debt payments
_PAYMENT_RATE = 0.02  # 2 % of outstanding balance per month


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def get_member_profile(member_id: str) -> dict:
    member = _MEMBERS.get(member_id)
    if not member:
        return {"error": f"Member {member_id} not found."}
    return {
        "member_id": member_id,
        "name": member["name"],
        "tenure_years": member["tenure_years"],
        "product_count": member["product_count"],
        "monthly_income": member["monthly_income"],
        "existing_loan_balances": member["existing_loan_balances"],
        "checking_balance": member["checking_balance"],
        "savings_balance": member["savings_balance"],
    }


def _synthetic_churn(member_id: str) -> dict:
    """Deterministic synthetic churn score — used when the churn API is unavailable."""
    seed = sum(ord(c) for c in member_id)
    score = round((seed % 100) / 100, 2)
    if score < 0.35:
        level = "low"
        narrative = "Member shows strong engagement with multiple products and consistent activity."
    elif score < 0.65:
        level = "medium"
        narrative = "Member has moderate engagement; some signs of reduced activity in recent months."
    else:
        level = "high"
        narrative = "Member shows limited product usage and decreased login frequency — elevated churn risk."
    return {
        "member_id": member_id,
        "churn_score": score,
        "risk_level": level,
        "narrative": narrative,
        "_source": "synthetic_fallback",
    }


def get_churn_risk(member_id: str) -> dict:
    # Skip the HTTP call entirely when no churn service is configured.
    if CHURN_API_URL is None:
        return _synthetic_churn(member_id)

    url = f"{CHURN_API_URL.rstrip('/')}/predict"
    try:
        response = httpx.post(url, json={"member_id": member_id}, timeout=8.0)
        response.raise_for_status()
        data = response.json()
        return {
            "member_id": member_id,
            "churn_score": data.get("churn_score"),
            "risk_level": data.get("risk_level"),
            "narrative": data.get("narrative", ""),
        }
    except httpx.HTTPStatusError as exc:
        return {"error": f"Churn API returned {exc.response.status_code}: {exc.response.text}"}
    except httpx.RequestError:
        return _synthetic_churn(member_id)


_POLICY: dict[str, dict] = {
    "auto":     {"max_dti": 0.45, "max_amount": 75_000.0},
    "personal": {"max_dti": 0.40, "max_amount": 25_000.0},
    "heloc":    {"max_dti": 0.43, "max_amount": 250_000.0},
}


def check_lending_policy(loan_type: str, loan_amount: float, dti: float) -> dict:
    loan_type = loan_type.lower().strip()
    policy = _POLICY.get(loan_type)
    if not policy:
        return {
            "error": f"Unknown loan type '{loan_type}'. Supported types: auto, personal, heloc."
        }

    violations: list[str] = []
    if dti > policy["max_dti"]:
        violations.append(
            f"DTI of {dti:.1%} exceeds maximum {policy['max_dti']:.0%} for {loan_type} loans."
        )
    if loan_amount > policy["max_amount"]:
        violations.append(
            f"Requested amount ${loan_amount:,.0f} exceeds maximum ${policy['max_amount']:,.0f} "
            f"for {loan_type} loans."
        )

    return {
        "loan_type": loan_type,
        "loan_amount": loan_amount,
        "dti": dti,
        "policy_met": len(violations) == 0,
        "violations": violations,
    }


def calculate_dti(member_id: str, requested_payment: float) -> dict:
    member = _MEMBERS.get(member_id)
    if not member:
        return {"error": f"Member {member_id} not found."}

    monthly_income = member["monthly_income"]
    existing_payments = sum(
        bal * _PAYMENT_RATE for bal in member["existing_loan_balances"].values()
    )
    current_dti = existing_payments / monthly_income if monthly_income > 0 else 0.0
    projected_dti = (existing_payments + requested_payment) / monthly_income if monthly_income > 0 else 0.0

    return {
        "member_id": member_id,
        "monthly_income": monthly_income,
        "existing_monthly_payments": round(existing_payments, 2),
        "current_dti": round(current_dti, 4),
        "projected_dti": round(projected_dti, 4),
        "requested_payment": requested_payment,
    }


# ---------------------------------------------------------------------------
# Anthropic tool schemas
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "name": "get_member_profile",
        "description": (
            "Retrieve a credit union member's profile including tenure, product count, "
            "estimated monthly income, existing loan balances, and deposit account balances. "
            "Use this as the first step before any analysis or lending decision."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "member_id": {
                    "type": "string",
                    "description": "The unique member identifier (e.g. 'M001').",
                }
            },
            "required": ["member_id"],
        },
    },
    {
        "name": "get_churn_risk",
        "description": (
            "Fetch the churn risk assessment for a member from the Project 5 churn prediction API. "
            "Returns a numeric churn_score (0–1), a categorical risk_level (low/medium/high), "
            "and a plain-language narrative explaining the key risk drivers. "
            "Use this to tailor the loan conversation and retention strategy."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "member_id": {
                    "type": "string",
                    "description": "The unique member identifier.",
                }
            },
            "required": ["member_id"],
        },
    },
    {
        "name": "check_lending_policy",
        "description": (
            "Check whether a proposed loan meets the credit union's internal lending policy. "
            "Policy limits by loan type — "
            "auto: max DTI 45%, max $75,000; "
            "personal: max DTI 40%, max $25,000; "
            "heloc: max DTI 43%, max $250,000. "
            "Returns policy_met (bool) and a list of any policy violations. "
            "Always call this before recommending approval."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "loan_type": {
                    "type": "string",
                    "enum": ["auto", "personal", "heloc"],
                    "description": "Type of loan being evaluated.",
                },
                "loan_amount": {
                    "type": "number",
                    "description": "Total requested loan amount in USD.",
                },
                "dti": {
                    "type": "number",
                    "description": (
                        "Projected debt-to-income ratio as a decimal (e.g. 0.38 for 38%). "
                        "Use the projected_dti from calculate_dti."
                    ),
                },
            },
            "required": ["loan_type", "loan_amount", "dti"],
        },
    },
    {
        "name": "calculate_dti",
        "description": (
            "Calculate the member's current and projected debt-to-income ratios given a new "
            "loan payment. Uses the member's monthly income and existing loan balances to "
            "compute current_dti (existing obligations only) and projected_dti (including the "
            "new requested payment). Call this before check_lending_policy to obtain the DTI."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "member_id": {
                    "type": "string",
                    "description": "The unique member identifier.",
                },
                "requested_payment": {
                    "type": "number",
                    "description": "Estimated monthly payment for the new loan, in USD.",
                },
            },
            "required": ["member_id", "requested_payment"],
        },
    },
]


# ---------------------------------------------------------------------------
# Dispatcher — called by the agent graph when Claude returns a tool_use block
# ---------------------------------------------------------------------------

TOOL_FUNCTIONS: dict[str, callable] = {
    "get_member_profile": get_member_profile,
    "get_churn_risk": get_churn_risk,
    "check_lending_policy": check_lending_policy,
    "calculate_dti": calculate_dti,
}


def dispatch_tool(tool_name: str, tool_input: dict) -> dict:
    fn = TOOL_FUNCTIONS.get(tool_name)
    if fn is None:
        return {"error": f"Unknown tool: {tool_name}"}
    return fn(**tool_input)
