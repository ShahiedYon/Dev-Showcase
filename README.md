# Dev Showcase

Dev Showcase is a portfolio-ready proof of concept featuring **Luma Flow**, a suite of lightweight internal business automation apps.

The project is designed for interviewers and technical reviewers to see practical full-stack work: React UI, FastAPI services, file upload workflows, data processing, validation, exports, and reusable automation patterns.

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

## CV Summary

**Dev Showcase: Luma Flow Automation Suite**  
Built a full-stack proof of concept for internal business automation workflows using React, TypeScript, FastAPI, pandas, and Excel export pipelines. The suite demonstrates adaptable modules for messy data cleanup, report reconciliation, source-to-template mapping, and structured document extraction.
