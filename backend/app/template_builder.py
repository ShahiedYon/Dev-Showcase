from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import re
from typing import Any
from uuid import uuid4

import pandas as pd

from app.transformer import read_table


@dataclass
class TemplateBuildResult:
    completed_rows: list[dict[str, Any]]
    issues: list[dict[str, Any]]
    summary: dict[str, int]


def suggest_template_mappings(source_columns: list[str], template_columns: list[str]) -> dict[str, str]:
    source_by_normalized = {_normalize(column): column for column in source_columns}
    suggestions: dict[str, str] = {}

    for target in template_columns:
        normalized_target = _normalize(target)
        if normalized_target in source_by_normalized:
            suggestions[target] = source_by_normalized[normalized_target]
            continue

        best_column = ""
        best_score = 0
        target_tokens = set(normalized_target.split())
        for source in source_columns:
            source_tokens = set(_normalize(source).split())
            if not target_tokens or not source_tokens:
                continue
            score = len(target_tokens.intersection(source_tokens))
            if score > best_score:
                best_score = score
                best_column = source
        suggestions[target] = best_column if best_score else ""

    return suggestions


def build_template_rows(
    source_rows: list[dict[str, Any]],
    template_columns: list[str],
    mappings: dict[str, str],
    required_fields: list[str],
) -> TemplateBuildResult:
    if not template_columns:
        raise ValueError("The target template does not contain usable columns.")

    completed_rows: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    required = set(required_fields)

    for row_number, source_row in enumerate(source_rows, start=2):
        completed_row: dict[str, Any] = {}
        for target in template_columns:
            source_column = mappings.get(target, "")
            completed_row[target] = _cell(source_row, source_column) if source_column else ""

        for field in required:
            if field in template_columns and not str(completed_row.get(field, "")).strip():
                issues.append(
                    {
                        "row": row_number,
                        "field": field,
                        "issue": "Required target field is blank.",
                    }
                )
        completed_rows.append(completed_row)

    summary = {
        "sourceRows": len(source_rows),
        "templateFields": len(template_columns),
        "mappedFields": len([field for field, source in mappings.items() if field in template_columns and source]),
        "issues": len(issues),
    }
    return TemplateBuildResult(completed_rows=completed_rows, issues=issues, summary=summary)


def export_template_workbook(result: TemplateBuildResult, output_dir: Path, prefix: str) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    output_path = output_dir / f"{prefix}_template_{timestamp}_{uuid4().hex[:8]}.xlsx"

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        pd.DataFrame(result.completed_rows).to_excel(writer, sheet_name="Completed Template", index=False)
        pd.DataFrame([result.summary]).to_excel(writer, sheet_name="Summary", index=False)
        if result.issues:
            pd.DataFrame(result.issues).to_excel(writer, sheet_name="Validation Issues", index=False)

    return output_path


def read_template_file(path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    return read_table(path)


def _cell(row: dict[str, Any], column: str | None) -> str:
    if not column:
        return ""
    return str(row.get(column, "")).strip()


def _normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()
