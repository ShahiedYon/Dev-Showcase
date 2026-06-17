# Dev Showcase

Dev Showcase is a portfolio-ready collection of practical full-stack proof-of-concept projects.

It is designed for interviewers and technical reviewers to see practical work across React UI, FastAPI services, file upload workflows, ETL pipelines, data validation, exports, dashboards, and reusable automation patterns.

## Featured Projects

### Luma Flow Automation Suite

Luma Flow is a suite of lightweight internal business automation apps.

It demonstrates reusable workflows for:

- Data Flow: clean, map, validate, and export messy business files.
- Reconciliation Flow: compare two reports and export exception findings.
- Template Flow: backend-ready source-to-template mapping and export.
- Document Extraction Flow: backend-ready structured extraction from text-readable documents.
- Lead Flow: demo-preview module.

### DataFlow Control Tower

DataFlow Control Tower is an end-to-end retail data quality pipeline for a fictional ecommerce brand, UrbanThread Outfitters.

It demonstrates:

- CSV, Excel, nested JSON, and fake API ingestion
- Python ETL with Pandas, SQLAlchemy, SQLite, and FastAPI
- Data quality rules for duplicate records, missing fields, SKU mapping, returns, shipments, and inventory availability
- React + TypeScript dashboard with revenue, DQ issue, inventory risk, and AI-style quality summary views

Project folder:

```text
projects/dataflow-control-tower/
```

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: FastAPI, pandas, openpyxl
- Data: CSV, XLSX, JSON, SQLite

## Run Luma Flow

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

## Run DataFlow Control Tower

Backend:

```powershell
cd "projects\dataflow-control-tower\backend"
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Frontend:

```powershell
cd "projects\dataflow-control-tower\frontend"
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5174/
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

These are portfolio/demo proof-of-concept projects, not production SaaS apps. They are designed to show adaptable internal tooling patterns for business data transformation, reconciliation, template generation, document extraction, and data quality analytics.

## CV Summary

**Dev Showcase: Luma Flow Automation Suite**  
Built a full-stack proof of concept for internal business automation workflows using React, TypeScript, FastAPI, pandas, and Excel export pipelines. The suite demonstrates adaptable modules for messy data cleanup, report reconciliation, source-to-template mapping, and structured document extraction.

**Dev Showcase: DataFlow Control Tower**  
Built an end-to-end retail data quality platform using Python, FastAPI, SQLAlchemy, SQLite, Pandas, React, TypeScript, and Recharts. The project ingests messy CSV, Excel, JSON, and API-style feeds, applies validation rules, loads clean canonical tables, logs rejected records, and visualizes trusted revenue, inventory risk, and data quality insights.
