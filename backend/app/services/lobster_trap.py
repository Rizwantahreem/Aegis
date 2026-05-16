"""
Lobster Trap Policy Enforcement Engine (Simulated)

Simulates Veea's Lobster Trap policy enforcement layer.
In production, this would call the Lobster Trap Go binary.
For the hackathon MVP, we implement the same concepts in Python:
- Pattern-based policy matching
- Block/warn/log actions
- Policy violation reporting
"""

import re
from typing import Optional
from sqlalchemy.orm import Session
from ..models import Policy

# Default policies (seeded into DB)
DEFAULT_POLICIES = [
    {
        "name": "block_prompt_injection",
        "description": "Detects prompt injection attempts that try to override system instructions",
        "pattern": r"(?i)(ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts)|you\s+are\s+now\s+in\s+developer\s+mode|bypass\s+(all\s+)?safety|disregard\s+(your|all)\s+(rules|instructions|guidelines)|pretend\s+you\s+(have\s+no|don't\s+have)\s+(restrictions|rules)|jailbreak|DAN\s+mode|override\s+system\s+prompt|reveal\s+(your\s+)?(system\s+)?prompt|act\s+as\s+if\s+you\s+have\s+no\s+restrictions)",
        "action": "block",
        "category": "injection",
    },
    {
        "name": "block_pii_email",
        "description": "Detects email addresses in prompts to prevent PII leakage",
        "pattern": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        "action": "block",
        "category": "pii",
    },
    {
        "name": "block_pii_ssn",
        "description": "Detects Social Security Numbers",
        "pattern": r"\b\d{3}-\d{2}-\d{4}\b",
        "action": "block",
        "category": "pii",
    },
    {
        "name": "block_pii_credit_card",
        "description": "Detects credit card numbers",
        "pattern": r"\b(?:\d{4}[-\s]?){3}\d{4}\b",
        "action": "block",
        "category": "pii",
    },
    {
        "name": "block_pii_phone",
        "description": "Detects phone numbers",
        "pattern": r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",
        "action": "warn",
        "category": "pii",
    },
    {
        "name": "block_dangerous_sql",
        "description": "Detects SQL injection and dangerous SQL commands",
        "pattern": r"(?i)(DROP\s+TABLE|DELETE\s+FROM|TRUNCATE|ALTER\s+TABLE|INSERT\s+INTO.*VALUES|UPDATE\s+\w+\s+SET|UNION\s+SELECT|;\s*SELECT|'\s*OR\s+'1'\s*=\s*'1)",
        "action": "block",
        "category": "command",
    },
    {
        "name": "block_dangerous_shell",
        "description": "Detects dangerous shell commands",
        "pattern": r"(?i)(rm\s+-rf|sudo\s+|chmod\s+777|curl\s+.*\|\s*sh|wget\s+.*\|\s*bash|eval\s*\(|exec\s*\(|os\.system|subprocess\.)",
        "action": "block",
        "category": "command",
    },
    {
        "name": "warn_excessive_output",
        "description": "Warns when prompts request extremely long outputs",
        "pattern": r"(?i)(generate\s+\d{4,}\s+words?|write\s+\d{4,}\s+words?|10,?000\s+word)",
        "action": "warn",
        "category": "cost",
    },
]


class PolicyViolation:
    def __init__(self, policy_name: str, action: str, category: str, description: str, matched_text: str):
        self.policy_name = policy_name
        self.action = action
        self.category = category
        self.description = description
        self.matched_text = matched_text

    def to_dict(self):
        return {
            "policy_name": self.policy_name,
            "action": self.action,
            "category": self.category,
            "description": self.description,
            "matched_text": self.matched_text[:100],  # Truncate for safety
        }


def inspect_prompt(prompt: str, db: Session) -> list[PolicyViolation]:
    """
    Run prompt through all enabled policies. Returns list of violations.
    This simulates Lobster Trap's `inspect` command.
    """
    violations = []
    policies = db.query(Policy).filter(Policy.enabled == True).all()

    for policy in policies:
        try:
            matches = re.findall(policy.pattern, prompt)
            if matches:
                matched = matches[0] if isinstance(matches[0], str) else str(matches[0])
                violations.append(
                    PolicyViolation(
                        policy_name=policy.name,
                        action=policy.action,
                        category=policy.category,
                        description=policy.description or "",
                        matched_text=matched,
                    )
                )
        except re.error:
            continue

    return violations


def should_block(violations: list[PolicyViolation]) -> bool:
    """Returns True if any violation has action='block'."""
    return any(v.action == "block" for v in violations)


def seed_policies(db: Session):
    """Seed default policies into the database if they don't exist."""
    for p in DEFAULT_POLICIES:
        existing = db.query(Policy).filter(Policy.name == p["name"]).first()
        if not existing:
            db.add(Policy(
                name=p["name"],
                description=p["description"],
                pattern=p["pattern"],
                action=p["action"],
                category=p["category"],
                enabled=True,
            ))
    db.commit()
