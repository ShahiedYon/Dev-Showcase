You are Codex acting as a senior full-stack data engineer.

Build a portfolio project called **DataFlow Control Tower** using the files in this repository.

## Goal

Create an end-to-end technical data pipeline that ingests messy retail/ecommerce data from CSV, Excel, JSON, and fake API sources, validates it, normalizes it, loads clean data into a database, exposes metrics through a FastAPI backend, and displays a modern React dashboard.

## Business back story

UrbanThread Outfitters is a fictional fast-growing online retail brand. Data is split across a storefront CSV export, warehouse Excel workbook, returns JSON portal, courier API response, and helpdesk API response. Leadership cannot trust revenue, inventory, returns, or fulfillment metrics because the data has duplicate records, inconsistent SKUs, missing fields, mixed date formats, shipment timeline errors, and return quantity mismatches.

The pipeline must convert this fragmented data into trusted analytics-ready tables.

## Input files

Use these raw files:

- `data/raw/sales_orders_raw.csv`
- `data/raw/warehouse_ops.xlsx`
- `data/raw/returns_refunds_raw.json`
- `data/raw/fake_api/shipments_api_response.json`
- `data/raw/fake_api/support_tickets_api_response.json`
- `dq_rules.yaml`
- Optional fake API server: `backend_stub/fake_api_server.py`

## Required architecture

Create this structure:

```text
backend/
  app/
    main.py
    database.py
    models.py
    schemas.py
    api/
      routes_pipeline.py
      routes_metrics.py
      routes_records.py
    pipeline/
      extract.py
      normalize.py
      validate.py
      load.py
      run_pipeline.py
      dq_rules.py
    services/
      metrics_service.py
      dq_summary_service.py
  tests/
    test_pipeline_validation.py
    test_normalization.py
  requirements.txt

frontend/
  src/
    App.tsx
    main.tsx
    api/client.ts
    components/
      KpiCards.tsx
      DataQualityIssues.tsx
      RevenueChart.tsx
      InventoryRiskTable.tsx
      PipelineRunPanel.tsx
    pages/
      Dashboard.tsx
  package.json

docs/
  architecture.md
  data_dictionary.md
  validation_rules.md
```

## Backend requirements

Use Python, FastAPI, SQLAlchemy, SQLite, Pandas or Polars, and Pydantic.

Create API endpoints:

- `POST /pipeline/run`
- `GET /pipeline/status`
- `GET /metrics/summary`
- `GET /metrics/revenue-by-month`
- `GET /metrics/top-dq-issues`
- `GET /records/errors`
- `GET /records/orders`
- `GET /records/inventory-risk`
- `GET /ai/data-quality-summary`

The `/ai/data-quality-summary` endpoint does not need a paid LLM call. It can generate a deterministic plain-English summary from the issue log, for example:

> "The latest run processed 238 order lines. 84.5% passed validation. The most common issue was unmapped SKUs, followed by missing currency and invalid shipment timelines."

## Pipeline requirements

Implement:

1. Extract
   - Read CSV order data.
   - Read Excel sheets from `warehouse_ops.xlsx`.
   - Read nested JSON returns.
   - Read JSON API response files for shipments and support tickets.

2. Normalize
   - Standardize dates to ISO format.
   - Standardize currency to uppercase.
   - Standardize country codes.
   - Map messy SKUs to canonical SKUs using the Excel `sku_master` sheet.
   - Normalize customer emails to lowercase.
   - Convert numeric columns safely.

3. Validate
   - Required fields cannot be blank.
   - Quantity must be greater than zero.
   - Unit price must be greater than zero.
   - Discount must be between 0 and 100.
   - SKU must map to canonical SKU.
   - Return quantity cannot exceed sold quantity.
   - Return processed date cannot be before requested date.
   - Shipment delivered date cannot be before shipped date.
   - Delivered shipments should have tracking numbers.
   - Cancelled orders should not have delivered shipments.
   - Available inventory should equal on-hand quantity minus reserved quantity.
   - Duplicate business keys must be flagged.

4. Load
   - Store clean records in canonical tables.
   - Store rejected/problem records in `dq_issue_log`.
   - Store run totals in `pipeline_run_log`.

## Database tables

Create at least these tables:

- `dim_customer`
- `dim_product`
- `dim_warehouse`
- `fact_order_line`
- `fact_return`
- `fact_shipment`
- `fact_inventory_snapshot`
- `dq_issue_log`
- `pipeline_run_log`

## Frontend requirements

Create a modern dashboard with:

- KPI cards:
  - Total records processed
  - Clean record percentage
  - Data quality score
  - Total revenue
  - Total returns
  - Open support tickets
- Revenue by month chart
- Top data quality issues chart/table
- Inventory risk table
- Latest pipeline run panel
- Error records table with filters
- Button to run pipeline via `POST /pipeline/run`

Use a polished, modern layout suitable for a GitHub portfolio. Include loading states, error states, and empty states.

## Testing

Add pytest tests for:

- SKU normalization
- currency normalization
- duplicate detection
- required field validation
- return quantity exceeding sold quantity
- shipment delivered before shipped

## Documentation

Update or create:

- `README.md`
- `docs/architecture.md`
- `docs/data_dictionary.md`
- `docs/validation_rules.md`

The README must explain the back story, input sources, data problems, architecture, how to run locally, API endpoints, dashboard screenshots placeholder, and portfolio value.

## Commands

The final project should support:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

cd frontend
npm install
npm run dev
```

Also add Docker support if practical:

```bash
docker compose up --build
```

## Quality bar

Do not create a toy app. Make it look and feel like a realistic junior-to-mid data engineering portfolio project. Keep the code clean, modular, and documented.