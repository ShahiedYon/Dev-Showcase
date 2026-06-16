from pathlib import Path
import json
import shutil
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.config import PROJECT_ROOT, load_brand_config
from app.document_extraction import (
    DocumentText,
    export_extraction_workbook,
    extract_documents,
    extraction_preview,
    read_document_text,
)
from app.modules import MODULES
from app.reconciliation import (
    export_reconciliation_workbook,
    read_reconciliation_file,
    reconcile_tables,
    suggest_reconciliation,
)
from app.template_builder import (
    build_template_rows,
    export_template_workbook,
    read_template_file,
    suggest_template_mappings,
)
from app.transformer import (
    REQUIRED_FIELDS,
    clean_and_validate,
    export_workbook,
    read_table,
    suggest_mappings,
)

BACKEND_ROOT = Path(__file__).resolve().parents[1]
UPLOAD_DIR = BACKEND_ROOT / "uploads"
OUTPUT_DIR = BACKEND_ROOT / "outputs"
SAMPLE_DIR = PROJECT_ROOT / "samples"

app = FastAPI(title="Vextly White-Label App Suite")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/brand")
def brand() -> dict[str, str]:
    return load_brand_config()


@app.get("/api/modules")
def modules() -> list[dict[str, str]]:
    return MODULES


@app.get("/api/samples")
def samples() -> list[dict[str, str]]:
    return [
        {"name": path.name, "path": str(path)}
        for path in SAMPLE_DIR.glob("*")
        if path.suffix.lower() in {".csv", ".xlsx", ".txt", ".md", ".pdf"}
    ]


@app.post("/api/transform/preview")
async def preview(file: UploadFile = File(...)) -> dict:
    path = _save_upload(file)
    try:
        rows, columns = read_table(path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "uploadId": path.name,
        "columns": columns,
        "rows": rows[:25],
        "mappings": suggest_mappings(columns),
    }


@app.post("/api/transform/process")
def process(upload_id: str = Form(...), mappings_json: str = Form(...)) -> dict:
    path = UPLOAD_DIR / upload_id
    if not path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file was not found.")

    try:
        mappings = json.loads(mappings_json)
        _validate_required_mappings(mappings)
        rows, _columns = read_table(path)
        result = clean_and_validate(rows, mappings)
        brand_config = load_brand_config()
        output_path = export_workbook(result, OUTPUT_DIR, brand_config["exportFilePrefix"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Mapping data could not be read.") from exc

    return {
        "cleanRows": result.clean_rows[:50],
        "issues": result.issues,
        "exportFilename": output_path.name,
    }


@app.post("/api/reconciliation/preview")
async def reconciliation_preview(file_a: UploadFile = File(...), file_b: UploadFile = File(...)) -> dict:
    path_a = _save_upload(file_a)
    path_b = _save_upload(file_b)
    try:
        rows_a, columns_a = read_reconciliation_file(path_a)
        rows_b, columns_b = read_reconciliation_file(path_b)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "uploadAId": path_a.name,
        "uploadBId": path_b.name,
        "columnsA": columns_a,
        "columnsB": columns_b,
        "rowsA": rows_a[:25],
        "rowsB": rows_b[:25],
        "suggested": suggest_reconciliation(columns_a, columns_b),
    }


@app.post("/api/reconciliation/process")
def reconciliation_process(
    upload_a_id: str = Form(...),
    upload_b_id: str = Form(...),
    key_a: str = Form(...),
    key_b: str = Form(...),
    comparisons_json: str = Form(...),
) -> dict:
    path_a = UPLOAD_DIR / upload_a_id
    path_b = UPLOAD_DIR / upload_b_id
    if not path_a.exists() or not path_b.exists():
        raise HTTPException(status_code=404, detail="One or both uploaded files were not found.")

    try:
        comparisons = json.loads(comparisons_json)
        rows_a, _columns_a = read_reconciliation_file(path_a)
        rows_b, _columns_b = read_reconciliation_file(path_b)
        result = reconcile_tables(rows_a, rows_b, key_a, key_b, comparisons)
        brand_config = load_brand_config()
        output_path = export_reconciliation_workbook(result, OUTPUT_DIR, brand_config["exportFilePrefix"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Comparison data could not be read.") from exc

    return {
        "summary": result.summary,
        "matches": result.matches[:50],
        "exceptions": result.exceptions[:100],
        "exportFilename": output_path.name,
    }


@app.post("/api/template-builder/preview")
async def template_builder_preview(
    source_file: UploadFile = File(...), template_file: UploadFile = File(...)
) -> dict:
    source_path = _save_upload(source_file)
    template_path = _save_upload(template_file)
    try:
        source_rows, source_columns = read_template_file(source_path)
        template_rows, template_columns = read_template_file(template_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "uploadSourceId": source_path.name,
        "uploadTemplateId": template_path.name,
        "sourceColumns": source_columns,
        "templateColumns": template_columns,
        "sourceRows": source_rows[:25],
        "templateRows": template_rows[:10],
        "suggestedMappings": suggest_template_mappings(source_columns, template_columns),
    }


@app.post("/api/template-builder/process")
def template_builder_process(
    upload_source_id: str = Form(...),
    upload_template_id: str = Form(...),
    mappings_json: str = Form(...),
    required_fields_json: str = Form(""),
) -> dict:
    source_path = UPLOAD_DIR / upload_source_id
    template_path = UPLOAD_DIR / upload_template_id
    if not source_path.exists() or not template_path.exists():
        raise HTTPException(status_code=404, detail="One or both uploaded files were not found.")

    try:
        mappings = json.loads(mappings_json)
        source_rows, _source_columns = read_template_file(source_path)
        _template_rows, template_columns = read_template_file(template_path)
        required_fields = json.loads(required_fields_json) if required_fields_json else template_columns
        result = build_template_rows(source_rows, template_columns, mappings, required_fields)
        brand_config = load_brand_config()
        output_path = export_template_workbook(result, OUTPUT_DIR, brand_config["exportFilePrefix"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Template mapping data could not be read.") from exc

    return {
        "summary": result.summary,
        "completedRows": result.completed_rows[:50],
        "issues": result.issues[:100],
        "exportFilename": output_path.name,
    }


@app.post("/api/document-extraction/preview")
async def document_extraction_preview(files: list[UploadFile] = File(...)) -> dict:
    documents = _save_document_uploads(files)
    return {
        **extraction_preview(documents),
        "uploadIds": [document.upload_id for document in documents],
    }


@app.post("/api/document-extraction/process")
def document_extraction_process(upload_ids_json: str = Form(...), fields_json: str = Form(...)) -> dict:
    try:
        upload_ids = json.loads(upload_ids_json)
        fields = json.loads(fields_json)
        documents = _load_document_uploads(upload_ids)
        result = extract_documents(documents, fields)
        brand_config = load_brand_config()
        output_path = export_extraction_workbook(result, OUTPUT_DIR, brand_config["exportFilePrefix"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Document extraction data could not be read.") from exc

    return {
        "summary": result.summary,
        "rows": result.rows[:100],
        "issues": result.issues[:100],
        "exportFilename": output_path.name,
    }


@app.get("/api/exports/{filename}")
def download_export(filename: str) -> FileResponse:
    path = _safe_export_path(filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Export file was not found.")
    return FileResponse(path, filename=filename)


def _validate_required_mappings(mappings: dict[str, str]) -> None:
    missing = [field for field in REQUIRED_FIELDS if not mappings.get(field)]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required mappings: {', '.join(missing)}.",
        )


def _safe_export_path(filename: str) -> Path:
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Export filename is invalid.")

    output_root = OUTPUT_DIR.resolve()
    candidate = (OUTPUT_DIR / filename).resolve()
    try:
        candidate.relative_to(output_root)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Export filename is invalid.") from exc
    return candidate


def _save_upload(file: UploadFile) -> Path:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Choose a file to upload.")
    suffix = Path(file.filename).suffix.lower()
    if suffix not in {".csv", ".xlsx", ".xls"}:
        raise HTTPException(status_code=400, detail="Upload a CSV or Excel file.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    path = UPLOAD_DIR / f"{uuid4().hex}{suffix}"
    with path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return path


def _save_document_uploads(files: list[UploadFile]) -> list[DocumentText]:
    if not files:
        raise HTTPException(status_code=400, detail="Upload at least one document.")

    documents: list[DocumentText] = []
    for file in files:
        path = _save_upload_with_suffixes(file, {".txt", ".md", ".csv", ".xlsx", ".xls", ".pdf"})
        try:
            text = read_document_text(path)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        documents.append(DocumentText(upload_id=path.name, filename=file.filename or path.name, text=text))
    return documents


def _load_document_uploads(upload_ids: list[str]) -> list[DocumentText]:
    if not upload_ids:
        raise ValueError("Upload at least one document before extraction.")
    documents: list[DocumentText] = []
    for upload_id in upload_ids:
        path = UPLOAD_DIR / str(upload_id)
        if not path.exists():
            raise HTTPException(status_code=404, detail="One or more uploaded documents were not found.")
        documents.append(DocumentText(upload_id=path.name, filename=path.name, text=read_document_text(path)))
    return documents


def _save_upload_with_suffixes(file: UploadFile, allowed_suffixes: set[str]) -> Path:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Choose a file to upload.")
    suffix = Path(file.filename).suffix.lower()
    if suffix not in allowed_suffixes:
        allowed = ", ".join(sorted(allowed_suffixes))
        raise HTTPException(status_code=400, detail=f"Upload one of these file types: {allowed}.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    path = UPLOAD_DIR / f"{uuid4().hex}{suffix}"
    with path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return path
