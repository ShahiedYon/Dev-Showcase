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
class ReconciliationResult:
    summary: dict[str, int]
    matches: list[dict[str, Any]]
    exceptions: list[dict[str, Any]]


KEY_ALIASES = {
    "id",
    "invoice id",
    "invoice number",
    "order id",
    "order number",
    "transaction id",
    "customer id",
    "account id",
    "employee id",
    "reference",
    "reference id",
    "record id",
}

VALUE_ALIASES = {
    "amount",
    "total",
    "balance",
    "subtotal",
    "quantity",
    "qty",
    "status",
    "date",
    "invoice date",
    "posting date",
}


def suggest_reconciliation(
    columns_a: list[str], columns_b: list[str]
) -> dict[str, Any]:
    normalized_a = {_normalize(column): column for column in columns_a}
    normalized_b = {_normalize(column): column for column in columns_b}
    shared = sorted(set(normalized_a).intersection(normalized_b))

    key_a = ""
    key_b = ""
    for candidate in list(KEY_ALIASES) + shared:
        normalized = _normalize(candidate)
        if normalized in normalized_a and normalized in normalized_b:
            key_a = normalized_a[normalized]
            key_b = normalized_b[normalized]
            break

    comparisons: list[dict[str, str]] = []
    for normalized in shared:
        if normalized in {_normalize(key_a), _normalize(key_b)}:
            continue
        if normalized in VALUE_ALIASES or _looks_comparable(normalized):
            comparisons.append({"left": normalized_a[normalized], "right": normalized_b[normalized]})

    return {
        "keyA": key_a,
        "keyB": key_b,
        "comparisons": comparisons[:6],
    }


def reconcile_tables(
    rows_a: list[dict[str, Any]],
    rows_b: list[dict[str, Any]],
    key_a: str,
    key_b: str,
    comparisons: list[dict[str, str]],
) -> ReconciliationResult:
    if not key_a or not key_b:
        raise ValueError("Choose a key column for both reports.")

    index_a = _index_rows(rows_a, key_a, "Report A")
    index_b = _index_rows(rows_b, key_b, "Report B")
    keys_a = set(index_a)
    keys_b = set(index_b)
    shared_keys = sorted(keys_a.intersection(keys_b))
    exceptions: list[dict[str, Any]] = []
    matches: list[dict[str, Any]] = []

    for key in sorted(keys_a - keys_b):
        exceptions.append(
            {
                "type": "Missing in Report B",
                "key": key,
                "field": key_b,
                "reportAValue": _cell(index_a[key], key_a),
                "reportBValue": "",
            }
        )

    for key in sorted(keys_b - keys_a):
        exceptions.append(
            {
                "type": "Missing in Report A",
                "key": key,
                "field": key_a,
                "reportAValue": "",
                "reportBValue": _cell(index_b[key], key_b),
            }
        )

    for key in shared_keys:
        row_a = index_a[key]
        row_b = index_b[key]
        row_mismatches = _compare_row(key, row_a, row_b, comparisons)
        if row_mismatches:
            exceptions.extend(row_mismatches)
        else:
            matches.append({"key": key, "status": "Matched", "comparedFields": len(comparisons)})

    summary = {
        "reportARows": len(rows_a),
        "reportBRows": len(rows_b),
        "matched": len(matches),
        "exceptions": len(exceptions),
        "missingInA": len(keys_b - keys_a),
        "missingInB": len(keys_a - keys_b),
        "mismatchedFields": len([item for item in exceptions if item["type"] == "Mismatch"]),
    }

    return ReconciliationResult(summary=summary, matches=matches, exceptions=exceptions)


def export_reconciliation_workbook(
    result: ReconciliationResult, output_dir: Path, prefix: str
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    output_path = output_dir / f"{prefix}_reconciliation_{timestamp}_{uuid4().hex[:8]}.xlsx"

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        pd.DataFrame([result.summary]).to_excel(writer, sheet_name="Summary", index=False)
        pd.DataFrame(result.matches).to_excel(writer, sheet_name="Matches", index=False)
        pd.DataFrame(result.exceptions).to_excel(writer, sheet_name="Exceptions", index=False)

    return output_path


def read_reconciliation_file(path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    return read_table(path)


def _index_rows(rows: list[dict[str, Any]], key_column: str, label: str) -> dict[str, dict[str, Any]]:
    index: dict[str, dict[str, Any]] = {}
    for row_number, row in enumerate(rows, start=2):
        key = _normalize_key(_cell(row, key_column))
        if not key:
            continue
        if key in index:
            raise ValueError(f"{label} has duplicate key '{key}' near row {row_number}.")
        index[key] = row
    return index


def _compare_row(
    key: str,
    row_a: dict[str, Any],
    row_b: dict[str, Any],
    comparisons: list[dict[str, str]],
) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    for comparison in comparisons:
        left = comparison.get("left", "")
        right = comparison.get("right", "")
        if not left or not right:
            continue
        value_a = _cell(row_a, left)
        value_b = _cell(row_b, right)
        if _normalize_value(value_a) != _normalize_value(value_b):
            issues.append(
                {
                    "type": "Mismatch",
                    "key": key,
                    "field": f"{left} -> {right}",
                    "reportAValue": value_a,
                    "reportBValue": value_b,
                }
            )
    return issues


def _cell(row: dict[str, Any], column: str) -> str:
    return str(row.get(column, "")).strip()


def _normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _normalize_key(value: str) -> str:
    return _normalize(value).replace(" ", "")


def _normalize_value(value: str) -> str:
    stripped = value.strip()
    numeric = pd.to_numeric(stripped.replace(",", "").replace("$", ""), errors="coerce")
    if not pd.isna(numeric):
        return f"{float(numeric):.2f}"
    parsed_date = pd.to_datetime(stripped, errors="coerce")
    if not pd.isna(parsed_date):
        return parsed_date.strftime("%Y-%m-%d")
    return _normalize(stripped)


def _looks_comparable(normalized: str) -> bool:
    return any(token in normalized for token in VALUE_ALIASES)
