from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)
SAMPLE_FILE = __import__("pathlib").Path(__file__).resolve().parents[2] / "samples" / "messy_customer_data.csv"
SAMPLES = __import__("pathlib").Path(__file__).resolve().parents[2] / "samples"


def test_health_brand_and_modules():
    assert client.get("/api/health").json() == {"status": "ok"}

    brand = client.get("/api/brand").json()
    assert brand["brandName"] == "Luma Flow"
    assert brand["exportFilePrefix"] == "luma_flow_export"

    modules = client.get("/api/modules").json()
    assert len(modules) == 5
    assert modules[0]["id"] == "data-transform"


def test_preview_process_and_export_sample_file():
    with open(SAMPLE_FILE, "rb") as file:
        preview_response = client.post(
            "/api/transform/preview",
            files={"file": ("messy_customer_data.csv", file, "text/csv")},
        )

    assert preview_response.status_code == 200
    preview = preview_response.json()
    assert preview["uploadId"]
    assert preview["mappings"]["Email"] == "email address"

    process_response = client.post(
        "/api/transform/process",
        data={
            "upload_id": preview["uploadId"],
            "mappings_json": __import__("json").dumps(preview["mappings"]),
        },
    )

    assert process_response.status_code == 200
    processed = process_response.json()
    assert processed["cleanRows"]
    assert processed["issues"]
    assert processed["exportFilename"].endswith(".xlsx")

    download_response = client.get(f"/api/exports/{processed['exportFilename']}")
    assert download_response.status_code == 200


def test_export_download_rejects_path_traversal():
    response = client.get("/api/exports/..%5Capp%5Cmain.py")

    assert response.status_code == 400


def test_process_rejects_missing_required_mappings():
    with open(SAMPLE_FILE, "rb") as file:
        preview_response = client.post(
            "/api/transform/preview",
            files={"file": ("messy_customer_data.csv", file, "text/csv")},
        )
    upload_id = preview_response.json()["uploadId"]

    response = client.post(
        "/api/transform/process",
        data={"upload_id": upload_id, "mappings_json": "{}"},
    )

    assert response.status_code == 400
    assert "Missing required mappings" in response.json()["detail"]


def test_reconciliation_preview_process_and_export_sample_files():
    with open(SAMPLES / "reconciliation_report_a.csv", "rb") as file_a:
        with open(SAMPLES / "reconciliation_report_b.csv", "rb") as file_b:
            preview_response = client.post(
                "/api/reconciliation/preview",
                files={
                    "file_a": ("reconciliation_report_a.csv", file_a, "text/csv"),
                    "file_b": ("reconciliation_report_b.csv", file_b, "text/csv"),
                },
            )

    assert preview_response.status_code == 200
    preview = preview_response.json()
    assert preview["suggested"]["keyA"] == "invoice_id"
    assert preview["suggested"]["comparisons"]

    process_response = client.post(
        "/api/reconciliation/process",
        data={
            "upload_a_id": preview["uploadAId"],
            "upload_b_id": preview["uploadBId"],
            "key_a": preview["suggested"]["keyA"],
            "key_b": preview["suggested"]["keyB"],
            "comparisons_json": __import__("json").dumps(preview["suggested"]["comparisons"]),
        },
    )

    assert process_response.status_code == 200
    processed = process_response.json()
    assert processed["summary"]["exceptions"] > 0
    assert processed["exportFilename"].endswith(".xlsx")


def test_template_builder_preview_process_and_export_sample_files():
    with open(SAMPLES / "template_source_customers.csv", "rb") as source_file:
        with open(SAMPLES / "template_target_upload.csv", "rb") as template_file:
            preview_response = client.post(
                "/api/template-builder/preview",
                files={
                    "source_file": ("template_source_customers.csv", source_file, "text/csv"),
                    "template_file": ("template_target_upload.csv", template_file, "text/csv"),
                },
            )

    assert preview_response.status_code == 200
    preview = preview_response.json()
    assert preview["suggestedMappings"]["Customer ID"] == "client id"
    assert preview["templateColumns"]

    process_response = client.post(
        "/api/template-builder/process",
        data={
            "upload_source_id": preview["uploadSourceId"],
            "upload_template_id": preview["uploadTemplateId"],
            "mappings_json": __import__("json").dumps(preview["suggestedMappings"]),
            "required_fields_json": __import__("json").dumps(preview["templateColumns"]),
        },
    )

    assert process_response.status_code == 200
    processed = process_response.json()
    assert processed["summary"]["sourceRows"] == 3
    assert processed["completedRows"][0]["Customer ID"] == "C-1001"
    assert processed["exportFilename"].endswith(".xlsx")


def test_document_extraction_preview_process_and_export_sample_files():
    with open(SAMPLES / "document_invoice_alpha.txt", "rb") as alpha:
        with open(SAMPLES / "document_invoice_beta.txt", "rb") as beta:
            preview_response = client.post(
                "/api/document-extraction/preview",
                files=[
                    ("files", ("document_invoice_alpha.txt", alpha, "text/plain")),
                    ("files", ("document_invoice_beta.txt", beta, "text/plain")),
                ],
            )

    assert preview_response.status_code == 200
    preview = preview_response.json()
    assert len(preview["uploadIds"]) == 2
    assert preview["suggestedFields"]

    process_response = client.post(
        "/api/document-extraction/process",
        data={
            "upload_ids_json": __import__("json").dumps(preview["uploadIds"]),
            "fields_json": __import__("json").dumps(preview["suggestedFields"]),
        },
    )

    assert process_response.status_code == 200
    processed = process_response.json()
    assert processed["summary"]["documents"] == 2
    assert processed["rows"][0]["Vendor"] == "Northwind Supplies"
    assert processed["exportFilename"].endswith(".xlsx")
