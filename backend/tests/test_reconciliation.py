from pathlib import Path

from app.reconciliation import (
    export_reconciliation_workbook,
    read_reconciliation_file,
    reconcile_tables,
    suggest_reconciliation,
)


SAMPLES = Path(__file__).resolve().parents[2] / "samples"
REPORT_A = SAMPLES / "reconciliation_report_a.csv"
REPORT_B = SAMPLES / "reconciliation_report_b.csv"


def test_reconciliation_suggests_keys_and_comparisons():
    _rows_a, columns_a = read_reconciliation_file(REPORT_A)
    _rows_b, columns_b = read_reconciliation_file(REPORT_B)

    suggested = suggest_reconciliation(columns_a, columns_b)

    assert suggested["keyA"] == "invoice_id"
    assert suggested["keyB"] == "invoice_id"
    assert {"left": "amount", "right": "amount"} in suggested["comparisons"]


def test_reconciliation_finds_missing_and_mismatched_records(tmp_path):
    rows_a, columns_a = read_reconciliation_file(REPORT_A)
    rows_b, columns_b = read_reconciliation_file(REPORT_B)
    suggested = suggest_reconciliation(columns_a, columns_b)

    result = reconcile_tables(
        rows_a,
        rows_b,
        suggested["keyA"],
        suggested["keyB"],
        suggested["comparisons"],
    )

    assert result.summary["matched"] >= 2
    assert result.summary["missingInA"] == 1
    assert result.summary["missingInB"] == 1
    assert result.summary["mismatchedFields"] >= 2

    output = export_reconciliation_workbook(result, tmp_path, "luma_flow_export")

    assert output.exists()
    assert output.suffix == ".xlsx"
