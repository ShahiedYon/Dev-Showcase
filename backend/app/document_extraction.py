from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import re
from typing import Any
from uuid import uuid4

import pandas as pd

from app.transformer import read_table


DEFAULT_FIELDS = [
    {"name": "Document ID", "pattern": r"(?:invoice|document|record)\s*(?:id|number|no\.?)\s*[:#-]?\s*([A-Z0-9-]+)"},
    {"name": "Vendor", "pattern": r"(?:vendor|supplier|company)\s*[:#-]?\s*([^\n\r]+)"},
    {"name": "Invoice Date", "pattern": r"(?:invoice\s*)?date\s*[:#-]?\s*([A-Za-z0-9,\-/ ]+)"},
    {"name": "Due Date", "pattern": r"due\s*date\s*[:#-]?\s*([A-Za-z0-9,\-/ ]+)"},
    {"name": "Total Amount", "pattern": r"(?:total|amount due|balance due)\s*[:#-]?\s*\$?\s*([0-9,.]+)"},
    {"name": "Email", "pattern": r"([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})"},
]


@dataclass
class DocumentText:
    upload_id: str
    filename: str
    text: str


@dataclass
class ExtractionResult:
    rows: list[dict[str, Any]]
    issues: list[dict[str, Any]]
    summary: dict[str, int]


def read_document_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".txt", ".md"}:
        return path.read_text(encoding="utf-8", errors="ignore")
    if suffix in {".csv", ".xlsx", ".xls"}:
        rows, columns = read_table(path)
        lines = [", ".join(columns)]
        for row in rows:
            lines.append(", ".join(f"{column}: {row.get(column, '')}" for column in columns))
        return "\n".join(lines)
    if suffix == ".pdf":
        return _read_text_readable_pdf(path)
    raise ValueError("Unsupported document type. Upload TXT, Markdown, CSV, Excel, or text-readable PDF files.")


def extraction_preview(documents: list[DocumentText]) -> dict[str, Any]:
    return {
        "documents": [
            {
                "uploadId": document.upload_id,
                "filename": document.filename,
                "previewText": _compact(document.text)[:900],
            }
            for document in documents
        ],
        "suggestedFields": DEFAULT_FIELDS,
    }


def extract_documents(documents: list[DocumentText], fields: list[dict[str, str]]) -> ExtractionResult:
    if not fields:
        raise ValueError("Add at least one extraction field.")

    rows: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []

    for document in documents:
        row: dict[str, Any] = {"Filename": document.filename}
        for field in fields:
            name = str(field.get("name", "")).strip()
            pattern = str(field.get("pattern", "")).strip()
            if not name:
                continue
            value = _extract_value(document.text, pattern) if pattern else ""
            row[name] = value
            if not value:
                issues.append(
                    {
                        "filename": document.filename,
                        "field": name,
                        "issue": "No value matched the configured pattern.",
                    }
                )
        rows.append(row)

    summary = {
        "documents": len(documents),
        "fields": len([field for field in fields if str(field.get("name", "")).strip()]),
        "extractedValues": sum(
            1
            for row in rows
            for key, value in row.items()
            if key != "Filename" and str(value).strip()
        ),
        "issues": len(issues),
    }
    return ExtractionResult(rows=rows, issues=issues, summary=summary)


def export_extraction_workbook(result: ExtractionResult, output_dir: Path, prefix: str) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    output_path = output_dir / f"{prefix}_document_extraction_{timestamp}_{uuid4().hex[:8]}.xlsx"

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        pd.DataFrame(result.rows).to_excel(writer, sheet_name="Extracted Data", index=False)
        pd.DataFrame([result.summary]).to_excel(writer, sheet_name="Summary", index=False)
        if result.issues:
            pd.DataFrame(result.issues).to_excel(writer, sheet_name="Review Issues", index=False)

    return output_path


def _extract_value(text: str, pattern: str) -> str:
    try:
        match = re.search(pattern, text, flags=re.IGNORECASE | re.MULTILINE)
    except re.error as exc:
        raise ValueError(f"Invalid extraction pattern: {pattern}") from exc
    if not match:
        return ""
    if match.groups():
        return _compact(str(match.group(1)))
    return _compact(str(match.group(0)))


def _read_text_readable_pdf(path: Path) -> str:
    data = path.read_bytes()
    text = data.decode("latin-1", errors="ignore")
    fragments = re.findall(r"\(([^()]{2,})\)\s*Tj", text)
    fragments.extend(re.findall(r"\(([^()]{2,})\)", text))
    compacted = "\n".join(_unescape_pdf_text(fragment) for fragment in fragments)
    if not compacted.strip():
        raise ValueError("This PDF does not expose readable text. Use OCR or upload a text export.")
    return compacted


def _unescape_pdf_text(value: str) -> str:
    return value.replace(r"\(", "(").replace(r"\)", ")").replace(r"\\", "\\")


def _compact(value: str) -> str:
    return re.sub(r"[ \t]+", " ", value.replace("\r", "\n")).strip()
