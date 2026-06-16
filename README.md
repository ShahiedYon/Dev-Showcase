# Luma Flow Demo

Luma Flow is a proof-of-concept suite for lightweight internal business automation apps.

It demonstrates reusable workflows for:

- Data Flow: clean, map, validate, and export messy business files.
- Reconciliation Flow: compare two reports and export exception findings.
- Template Flow: backend-ready source-to-template mapping and export.
- Document Extraction Flow: backend-ready structured extraction from text-readable documents.
- Lead Flow: demo-preview module.

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: FastAPI, pandas, openpyxl
- Data: CSV/XLSX sample files

## Run Backend

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Run Frontend

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open:

```text
http://127.0.0.1:5173/
```

## Sample Data

Sample files live in `samples/`.

- `messy_customer_data.csv`
- `reconciliation_report_a.csv`
- `reconciliation_report_b.csv`
- `template_source_customers.csv`
- `template_target_upload.csv`
- `document_invoice_alpha.txt`
- `document_invoice_beta.txt`

## Notes

This is a portfolio/demo proof of concept, not a production SaaS. It is designed to show adaptable internal tooling patterns for business data transformation, reconciliation, template generation, and document extraction.
