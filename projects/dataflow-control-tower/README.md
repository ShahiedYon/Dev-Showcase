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
cd projects\dataflow-control-tower\backend
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
cd projects\dataflow-control-tower\frontend
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5174/
```

The dashboard runs the pipeline on first load, then displays live metrics from the generated SQLite database.

## Netlify Demo Mode

The root `netlify.toml` builds both showcase frontends into one Netlify publish folder:

- DataFlow Control Tower at `/`
- Luma Flow at `/lumaflow/`

The DataFlow build sets `VITE_STATIC_DEMO=true`. That makes the public Netlify CV demo use a bundled data snapshot, because Netlify static hosting cannot run the local FastAPI backend at `127.0.0.1:8010`.

To connect the deployed frontend to a live backend later, deploy the FastAPI app to a service such as Render, Railway, or Fly.io, then set `VITE_STATIC_DEMO=false` and `VITE_API_BASE_URL` to that backend URL in Netlify.

## Tests

```powershell
cd projects\dataflow-control-tower
python -m pytest -q

cd frontend
npm run build
```

## CV Summary

**DataFlow Control Tower**  
Built an end-to-end retail data quality platform using Python, FastAPI, SQLAlchemy, SQLite, Pandas, React, TypeScript, and Recharts. The project ingests messy CSV, Excel, JSON, and API-style feeds, applies validation rules, loads clean canonical tables, logs rejected records, and visualizes trusted revenue, inventory risk, and data quality insights in a dashboard.
