from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import re
from typing import Any
from uuid import uuid4

import pandas as pd

TARGET_FIELDS = [
    "Customer ID",
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Company",
    "Signup Date",
    "Status",
]

REQUIRED_FIELDS = ["First Name", "Last Name", "Email", "Signup Date", "Status"]

FIELD_ALIASES = {
    "Customer ID": ["customer id", "cust id", "id", "client id"],
    "First Name": ["first name", "firstname"],
    "Last Name": ["last name", "lastname", "surname"],
    "Email": ["email", "email address", "e-mail"],
    "Phone": ["phone", "phone number", "mobile", "telephone"],
    "Company": ["company", "company name", "organization"],
    "Signup Date": ["signup", "signup date", "start date", "created date"],
    "Status": ["status", "state"],
}

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@dataclass
class TransformResult:
    clean_rows: list[dict[str, Any]]
    issues: list[dict[str, Any]]


def read_table(path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    if path.suffix.lower() == ".csv":
        frame = pd.read_csv(path, dtype=str).fillna("")
    elif path.suffix.lower() in {".xlsx", ".xls"}:
        frame = pd.read_excel(path, dtype=str).fillna("")
    else:
        raise ValueError("Unsupported file type. Upload a CSV or Excel file.")

    if frame.empty or not list(frame.columns):
        raise ValueError("The uploaded file does not contain readable rows or columns.")

    columns = [str(column) for column in frame.columns]
    return frame.to_dict(orient="records"), columns


def suggest_mappings(columns: list[str]) -> dict[str, str]:
    normalized_columns = {_normalize_name(column): column for column in columns}
    mappings: dict[str, str] = {}

    for target, aliases in FIELD_ALIASES.items():
        selected = ""
        for alias in aliases:
            normalized_alias = _normalize_name(alias)
            if normalized_alias in normalized_columns:
                selected = normalized_columns[normalized_alias]
                break
        mappings[target] = selected

    if not mappings["First Name"] and "full name" in normalized_columns:
        mappings["First Name"] = normalized_columns["full name"]
    if not mappings["Last Name"] and "full name" in normalized_columns:
        mappings["Last Name"] = normalized_columns["full name"]

    return mappings


def clean_and_validate(rows: list[dict[str, Any]], mappings: dict[str, str]) -> TransformResult:
    clean_rows: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    seen = set()

    for index, source in enumerate(rows, start=2):
        clean_row = _build_target_row(source, mappings)
        row_key = tuple(clean_row.get(field, "") for field in TARGET_FIELDS)
        if row_key in seen:
            continue
        seen.add(row_key)

        row_issues = _validate_row(index, clean_row)
        if row_issues:
            issues.extend(row_issues)
        else:
            clean_rows.append(clean_row)

    return TransformResult(clean_rows=clean_rows, issues=issues)


def export_workbook(result: TransformResult, output_dir: Path, prefix: str) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    output_path = output_dir / f"{prefix}_{timestamp}_{uuid4().hex[:8]}.xlsx"

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        pd.DataFrame(result.clean_rows, columns=TARGET_FIELDS).to_excel(
            writer, sheet_name="Clean Rows", index=False
        )
        if result.issues:
            pd.DataFrame(result.issues).to_excel(
                writer, sheet_name="Validation Issues", index=False
            )

    return output_path


def _build_target_row(source: dict[str, Any], mappings: dict[str, str]) -> dict[str, str]:
    first_mapping = mappings.get("First Name", "")
    last_mapping = mappings.get("Last Name", "")
    first_source = _cell(source, first_mapping)
    first_name, split_last_name = _split_name(first_source)
    last_name = split_last_name if last_mapping == first_mapping else _cell(source, last_mapping)

    row = {
        "Customer ID": _cell(source, mappings.get("Customer ID", "")),
        "First Name": first_name,
        "Last Name": last_name or split_last_name,
        "Email": _cell(source, mappings.get("Email", "")).lower(),
        "Phone": _format_phone(_cell(source, mappings.get("Phone", ""))),
        "Company": _cell(source, mappings.get("Company", "")),
        "Signup Date": _format_date(_cell(source, mappings.get("Signup Date", ""))),
        "Status": _normalize_status(_cell(source, mappings.get("Status", ""))),
    }

    return {key: value.strip() if isinstance(value, str) else value for key, value in row.items()}


def _validate_row(row_number: int, row: dict[str, str]) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    for field in REQUIRED_FIELDS:
        if not row.get(field):
            issues.append(
                {
                    "row": row_number,
                    "field": field,
                    "value": row.get(field, ""),
                    "issue": "Required value is missing or invalid.",
                }
            )

    if row.get("Email") and not EMAIL_PATTERN.match(row["Email"]):
        issues.append(
            {
                "row": row_number,
                "field": "Email",
                "value": row["Email"],
                "issue": "Email format is invalid.",
            }
        )

    return issues


def _cell(source: dict[str, Any], column: str | None) -> str:
    if not column:
        return ""
    return str(source.get(column, "")).strip()


def _normalize_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _split_name(value: str) -> tuple[str, str]:
    parts = value.strip().split()
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def _format_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    return value.strip()


def _format_date(value: str) -> str:
    if not value.strip():
        return ""
    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return ""
    return parsed.strftime("%Y-%m-%d")


def _normalize_status(value: str) -> str:
    normalized = value.strip().lower()
    if normalized in {"active", "inactive", "pending"}:
        return normalized.title()
    return ""
