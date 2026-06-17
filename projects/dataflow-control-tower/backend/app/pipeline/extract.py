from __future__ import annotations

from pathlib import Path
import json
from typing import Any

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[3]
RAW_DIR = PROJECT_ROOT / "data" / "raw"


def extract_sources() -> dict[str, Any]:
    orders = pd.read_csv(RAW_DIR / "sales_orders_raw.csv", dtype=str).fillna("")
    workbook = pd.ExcelFile(RAW_DIR / "warehouse_ops.xlsx")
    inventory = pd.read_excel(workbook, sheet_name="inventory_snapshot", dtype=str).fillna("")
    sku_master = pd.read_excel(workbook, sheet_name="sku_master", dtype=str).fillna("")
    warehouses = pd.read_excel(workbook, sheet_name="warehouse_lookup", dtype=str).fillna("")
    returns = json.loads((RAW_DIR / "returns_refunds_raw.json").read_text(encoding="utf-8"))
    shipments = json.loads((RAW_DIR / "fake_api" / "shipments_api_response.json").read_text(encoding="utf-8"))
    tickets = json.loads((RAW_DIR / "fake_api" / "support_tickets_api_response.json").read_text(encoding="utf-8"))

    return {
        "orders": orders,
        "inventory": inventory,
        "sku_master": sku_master,
        "warehouses": warehouses,
        "returns": returns.get("returns", []),
        "shipments": shipments.get("shipments", []),
        "support_tickets": tickets.get("tickets", []),
    }
