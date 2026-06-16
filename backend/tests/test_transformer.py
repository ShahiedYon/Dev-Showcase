from pathlib import Path

from app.transformer import (
    TARGET_FIELDS,
    clean_and_validate,
    export_workbook,
    read_table,
    suggest_mappings,
)


SAMPLE_FILE = Path(__file__).resolve().parents[2] / "samples" / "messy_customer_data.csv"


def test_read_table_and_suggest_mappings():
    rows, columns = read_table(SAMPLE_FILE)

    assert len(rows) == 8
    assert "full name" in columns

    mappings = suggest_mappings(columns)

    assert mappings["Customer ID"] == "cust id"
    assert mappings["Email"] == "email address"
    assert mappings["Signup Date"] == "signup"


def test_clean_and_validate_splits_names_and_flags_errors():
    rows, columns = read_table(SAMPLE_FILE)
    mappings = suggest_mappings(columns)

    result = clean_and_validate(rows, mappings)

    assert TARGET_FIELDS == [
        "Customer ID",
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "Company",
        "Signup Date",
        "Status",
    ]
    assert len(result.clean_rows) >= 4
    assert any(issue["field"] == "Email" for issue in result.issues)
    assert any(issue["field"] == "Signup Date" for issue in result.issues)
    assert any(issue["field"] == "Last Name" for issue in result.issues)


def test_export_workbook_creates_clean_and_issue_sheets(tmp_path):
    rows, columns = read_table(SAMPLE_FILE)
    result = clean_and_validate(rows, suggest_mappings(columns))

    output = export_workbook(result, tmp_path, "vextly_export")

    assert output.exists()
    assert output.suffix == ".xlsx"
