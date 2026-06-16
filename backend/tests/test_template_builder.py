from pathlib import Path

from app.template_builder import (
    build_template_rows,
    export_template_workbook,
    read_template_file,
    suggest_template_mappings,
)


SAMPLES = Path(__file__).resolve().parents[2] / "samples"
SOURCE = SAMPLES / "template_source_customers.csv"
TARGET = SAMPLES / "template_target_upload.csv"


def test_template_builder_suggests_adaptable_mappings():
    _source_rows, source_columns = read_template_file(SOURCE)
    _template_rows, template_columns = read_template_file(TARGET)

    mappings = suggest_template_mappings(source_columns, template_columns)

    assert mappings["Customer ID"] == "client id"
    assert mappings["Customer Name"] == "customer name"
    assert mappings["Company"] == "company name"


def test_template_builder_creates_target_shaped_rows_and_export(tmp_path):
    source_rows, source_columns = read_template_file(SOURCE)
    _template_rows, template_columns = read_template_file(TARGET)
    mappings = suggest_template_mappings(source_columns, template_columns)

    result = build_template_rows(source_rows, template_columns, mappings, template_columns)

    assert result.summary["sourceRows"] == 3
    assert result.completed_rows[0]["Customer ID"] == "C-1001"
    assert result.completed_rows[0]["Company"] == "Northwind Ltd"
    assert result.issues == []

    output = export_template_workbook(result, tmp_path, "luma_flow_export")

    assert output.exists()
    assert output.suffix == ".xlsx"
