from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml


PROJECT_ROOT = Path(__file__).resolve().parents[3]
RULES_PATH = PROJECT_ROOT / "dq_rules.yaml"


def load_rules() -> dict[str, Any]:
    with RULES_PATH.open("r", encoding="utf-8") as file:
        return yaml.safe_load(file)


def severity_for(rule_id: str) -> str:
    for rule in load_rules().get("validations", []):
        if rule.get("id") == rule_id:
            return str(rule.get("severity", "medium"))
    return "medium"
