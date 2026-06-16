from pathlib import Path

from app.document_extraction import (
    DEFAULT_FIELDS,
    DocumentText,
    export_extraction_workbook,
    extract_documents,
    extraction_preview,
    read_document_text,
)


SAMPLES = Path(__file__).resolve().parents[2] / "samples"
ALPHA = SAMPLES / "document_invoice_alpha.txt"
BETA = SAMPLES / "document_invoice_beta.txt"


def test_document_extraction_preview_reads_text_documents():
    text = read_document_text(ALPHA)
    preview = extraction_preview([DocumentText("alpha.txt", "document_invoice_alpha.txt", text)])

    assert "Northwind Supplies" in preview["documents"][0]["previewText"]
    assert any(field["name"] == "Total Amount" for field in preview["suggestedFields"])


def test_document_extraction_extracts_configured_fields_and_exports(tmp_path):
    documents = [
        DocumentText("alpha.txt", "document_invoice_alpha.txt", read_document_text(ALPHA)),
        DocumentText("beta.txt", "document_invoice_beta.txt", read_document_text(BETA)),
    ]

    result = extract_documents(documents, DEFAULT_FIELDS)

    assert result.summary["documents"] == 2
    assert result.rows[0]["Document ID"] == "INV-2048"
    assert result.rows[0]["Vendor"] == "Northwind Supplies"
    assert result.rows[1]["Document ID"] == "DOC-3051"
    assert result.rows[1]["Total Amount"] == "975.00"

    output = export_extraction_workbook(result, tmp_path, "luma_flow_export")

    assert output.exists()
    assert output.suffix == ".xlsx"
