from __future__ import annotations

import json
from typing import Any

import pandas as pd

from app.pipeline.dq_rules import severity_for


def issue(source: str, key: str, rule_id: str, field: str, message: str, row: dict[str, Any]) -> dict[str, Any]:
    return {
        "source_table": source,
        "business_key": key,
        "rule_id": rule_id,
        "severity": severity_for(rule_id),
        "field_name": field,
        "issue": message,
        "raw_payload": json.dumps(row, default=str),
    }


def detect_duplicates(rows: list[dict[str, Any]], key_field: str, source: str) -> list[dict[str, Any]]:
    seen: set[str] = set()
    issues: list[dict[str, Any]] = []
    for row in rows:
        key = str(row.get(key_field, "")).strip()
        if key in seen:
            issues.append(issue(source, key, "DQ008", key_field, "Duplicate business key detected.", row))
        seen.add(key)
    return issues


def validate_orders(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    issues = detect_duplicates(rows, "order_line_id", "sales_orders")
    bad_keys = {item["business_key"] for item in issues}
    required = ["order_id", "order_line_id", "order_date", "customer_id", "source_sku", "qty", "unit_price", "currency"]

    for row in rows:
        key = str(row.get("order_line_id", ""))
        for field in required:
            if row.get(field) in {"", None}:
                issues.append(issue("sales_orders", key, "DQ001", field, "Required field is blank.", row))
                bad_keys.add(key)
        if float(row.get("qty", 0)) <= 0:
            issues.append(issue("sales_orders", key, "DQ002", "qty", "Quantity must be greater than zero.", row))
            bad_keys.add(key)
        if float(row.get("unit_price", 0)) <= 0:
            issues.append(issue("sales_orders", key, "DQ003", "unit_price", "Unit price must be greater than zero.", row))
            bad_keys.add(key)
        if not 0 <= float(row.get("discount_pct", 0)) <= 100:
            issues.append(issue("sales_orders", key, "DQ004", "discount_pct", "Discount must be between 0 and 100.", row))
            bad_keys.add(key)
        if not row.get("canonical_sku"):
            issues.append(issue("sales_orders", key, "DQ005", "sku", "SKU did not map to canonical SKU.", row))
            bad_keys.add(key)

    clean = [row for row in rows if str(row.get("order_line_id", "")) not in bad_keys]
    return clean, issues


def validate_returns(returns: list[dict[str, Any]], order_rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    sold_qty: dict[tuple[str, str], float] = {}
    for row in order_rows:
        key = (str(row.get("order_id", "")), str(row.get("canonical_sku", "")))
        sold_qty[key] = sold_qty.get(key, 0) + float(row.get("qty", 0))

    issues: list[dict[str, Any]] = []
    bad_keys: set[str] = set()
    for row in returns:
        key = f"{row.get('return_id')}:{row.get('canonical_sku')}"
        if not row.get("canonical_sku"):
            issues.append(issue("returns", key, "DQ005", "sku", "Returned SKU did not map to canonical SKU.", row))
            bad_keys.add(key)
        if float(row.get("qty_returned", 0)) > sold_qty.get((row.get("order_id", ""), row.get("canonical_sku", "")), 0):
            issues.append(issue("returns", key, "DQ006", "qty_returned", "Return quantity exceeds sold quantity.", row))
            bad_keys.add(key)
        if row.get("processed_at") and row.get("requested_at") and row["processed_at"] < row["requested_at"]:
            issues.append(issue("returns", key, "DQ006", "processed_at", "Return processed date is before requested date.", row))
            bad_keys.add(key)
        if not row.get("reason_code"):
            issues.append(issue("returns", key, "DQ001", "reason_code", "Return reason is missing.", row))
    clean = [row for row in returns if f"{row.get('return_id')}:{row.get('canonical_sku')}" not in bad_keys]
    return clean, issues


def validate_shipments(shipments: list[dict[str, Any]], order_rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    order_status = {row.get("order_id"): str(row.get("order_status", "")).lower() for row in order_rows}
    issues = detect_duplicates(shipments, "shipment_id", "shipments")
    bad_keys = {item["business_key"] for item in issues}
    for row in shipments:
        key = str(row.get("shipment_id", ""))
        if row.get("delivered_at") and row.get("shipped_at") and row["delivered_at"] < row["shipped_at"]:
            issues.append(issue("shipments", key, "DQ007", "delivered_at", "Delivered date is before shipped date.", row))
            bad_keys.add(key)
        if row.get("status") == "delivered" and not row.get("tracking_number"):
            issues.append(issue("shipments", key, "DQ001", "tracking_number", "Delivered shipment has no tracking number.", row))
            bad_keys.add(key)
        if order_status.get(row.get("order_id")) == "cancelled" and row.get("status") == "delivered":
            issues.append(issue("shipments", key, "DQ009", "status", "Cancelled order has delivered shipment.", row))
            bad_keys.add(key)
    clean = [row for row in shipments if str(row.get("shipment_id", "")) not in bad_keys]
    return clean, issues


def validate_inventory(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    issues: list[dict[str, Any]] = []
    bad_indexes: set[int] = set()
    for index, row in enumerate(rows):
        key = f"{row.get('warehouse_id')}:{row.get('source_sku')}"
        if not row.get("canonical_sku"):
            issues.append(issue("inventory_snapshot", key, "DQ005", "source_sku", "Inventory SKU did not map to canonical SKU.", row))
            bad_indexes.add(index)
        expected = float(row.get("on_hand_qty", 0)) - float(row.get("reserved_qty", 0))
        if abs(float(row.get("available_qty", 0)) - expected) > 0.01:
            issues.append(issue("inventory_snapshot", key, "DQ010", "available_qty", "Available inventory does not equal on-hand minus reserved.", row))
    clean = [row for index, row in enumerate(rows) if index not in bad_indexes]
    return clean, issues


def month_key(value: str) -> str:
    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return "Unknown"
    return parsed.strftime("%Y-%m")
