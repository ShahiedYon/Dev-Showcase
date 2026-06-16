# Luma Flow

Five-module demo shell for lightweight internal business automation flows. Version 1 includes functional Data Flow and Reconciliation Flow modules. Template Flow and Document Extraction Flow now have backend APIs ready for frontend workflows.

## What Is Included

- Data Flow: functional CSV/XLSX preview, mapping, validation, and Excel export.
- Reconciliation Flow: functional two-file matching, field comparison, exception reporting, and Excel export.
- Template Flow: backend-ready source-to-template mapping, required-field validation, and Excel export.
- Document Extraction Flow: backend-ready configurable field extraction from TXT, Markdown, CSV, Excel, and text-readable PDF files.
- Lead Flow: demo-preview module.

## Run Backend

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The backend runs at `http://127.0.0.1:8000`.

## Run Frontend

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173`.

## Demo Flow

### Data Flow

1. Open the dashboard.
2. Choose Data Flow.
3. Upload `samples/messy_customer_data.csv`.
4. Review or adjust the suggested mappings.
5. Process the file.
6. Review clean rows and validation issues.
7. Download the Excel export.

### Reconciliation Flow

1. Open the dashboard.
2. Choose Reconciliation Flow.
3. Upload `samples/reconciliation_report_a.csv` as Report A.
4. Upload `samples/reconciliation_report_b.csv` as Report B.
5. Review or adjust key columns and comparison fields.
6. Reconcile the reports.
7. Download the Excel exception report.

### Template Flow Backend

Sample files:

- `samples/template_source_customers.csv`
- `samples/template_target_upload.csv`

API flow:

1. Post both files to `/api/template-builder/preview`.
2. Review `sourceColumns`, `templateColumns`, and `suggestedMappings`.
3. Post upload IDs, mappings, and optional required fields to `/api/template-builder/process`.
4. Download the exported workbook from `/api/exports/{filename}`.

### Document Extraction Flow Backend

Sample files:

- `samples/document_invoice_alpha.txt`
- `samples/document_invoice_beta.txt`

API flow:

1. Post one or more files to `/api/document-extraction/preview`.
2. Review `suggestedFields`, each with a field name and extraction pattern.
3. Post upload IDs and fields to `/api/document-extraction/process`.
4. Download the reviewed extraction workbook from `/api/exports/{filename}`.

## White-Label Config

Edit `brand.config.json` to change the visible brand name, app title, colors, logo path, and export filename prefix.

## Tests

```powershell
cd backend
python -m pytest -q
```

```powershell
cd frontend
npm run build
```
