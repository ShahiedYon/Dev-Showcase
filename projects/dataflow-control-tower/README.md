# DataFlow Control Tower

End-to-end retail data quality pipeline for a fictional ecommerce brand, **UrbanThread Outfitters**.

The project answers a practical business question:

> Can leadership trust revenue, inventory, returns, fulfillment, and support numbers when the source data is fragmented and messy?

It ingests CSV, Excel, nested JSON, and fake API response files, normalizes the data, validates known quality risks, loads canonical tables into SQLite, exposes FastAPI metrics, and renders a modern React dashboard.

## What It Demonstrates

- Python ETL pipeline with Pandas and SQLAlchemy
- CSV, Excel workbook, JSON, and API-style data ingestion
- Data quality rule engine driven by `dq_rules.yaml`
- Canonical dimensional/fact model in SQLite
- FastAPI endpoints for pipeline runs, metrics, records, and AI-style summaries
- React dashboard with Recharts visualizations
- Pytest coverage for normalization, duplicate detection, required fields, returns, shipments, and API contracts

## Project Shape

```text
data/raw/
  sales_orders_raw.csv
  warehouse_ops.xlsx
  returns_refunds_raw.json
  fake_api/
backend/
  app/
    api/
    pipeline/
    services/
  tests/
frontend/
  src/
docs/
  architecture.md
  data_dictionary.md
  validation_rules.md
```

## Backend

```powershell
cd "C:\Users\yonsh\OneDrive\Documents\Dev Showcase\projects\dataflow-control-tower\backend"
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Useful endpoints:

- `POST /pipeline/run`
- `GET /pipeline/status`
- `GET /metrics/summary`
- `GET /metrics/revenue-by-month`
- `GET /metrics/top-dq-issues`
- `GET /records/errors`
- `GET /records/orders`
- `GET /records/inventory-risk`
- `GET /ai/data-quality-summary`

## Frontend

```powershell
cd "C:\Users\yonsh\OneDrive\Documents\Dev Showcase\projects\dataflow-control-tower\frontend"
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5174/
```

The dashboard runs the pipeline on first load, then displays live metrics from the generated SQLite database.

## Tests

```powershell
cd "C:\Users\yonsh\OneDrive\Documents\Dev Showcase\projects\dataflow-control-tower"
python -m pytest -q

cd frontend
npm run build
```

## CV Summary

**DataFlow Control Tower**  
Built an end-to-end retail data quality platform using Python, FastAPI, SQLAlchemy, SQLite, Pandas, React, TypeScript, and Recharts. The project ingests messy CSV, Excel, JSON, and API-style feeds, applies validation rules, loads clean canonical tables, logs rejected records, and visualizes trusted revenue, inventory risk, and data quality insights in a dashboard.
