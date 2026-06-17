from __future__ import annotations

import re
from typing import Any

import pandas as pd


COUNTRY_MAP = {
    "RSA": "ZA",
    "SOUTH AFRICA": "ZA",
    "ZA": "ZA",
    "UNITED STATES": "US",
    "US": "US",
    "UK": "GB",
    "GB": "GB",
}


def normalize_sku(value: Any) -> str:
    text = str(value or "").strip().upper()
    text = text.replace("_", "-")
    text = re.sub(r"[^A-Z0-9-]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    if re.fullmatch(r"[A-Z]{3}\d{3}", text):
        return f"SKU-{text[:3]}-{text[3:]}"
    return text


def normalize_currency(value: Any) -> str:
    return str(value or "").strip().upper()


def normalize_email(value: Any) -> str:
    return str(value or "").strip().lower()


def normalize_country(value: Any) -> str:
    text = str(value or "").strip().upper()
    return COUNTRY_MAP.get(text, text)


def parse_date(value: Any) -> str:
    text = str(value or "").strip()
    if not text or text.lower() in {"nan", "nat", "none"}:
        return ""
    parts = text.split("/")
    dayfirst = len(parts) == 3 and parts[0].isdigit() and len(parts[0]) <= 2 and int(parts[0]) > 12
    parsed = pd.to_datetime(text, errors="coerce", utc=True, dayfirst=dayfirst)
    if pd.isna(parsed):
        return ""
    return parsed.strftime("%Y-%m-%d")


def parse_number(value: Any) -> float:
    parsed = pd.to_numeric(str(value or "").replace(",", "").replace("$", ""), errors="coerce")
    if pd.isna(parsed):
        return 0.0
    return float(parsed)


def build_sku_map(sku_master: pd.DataFrame) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for row in sku_master.to_dict(orient="records"):
        source = normalize_sku(row.get("source_sku"))
        canonical = normalize_sku(row.get("canonical_sku"))
        if source and canonical:
            mapping[source] = canonical
    return mapping


def normalize_orders(orders: pd.DataFrame, sku_map: dict[str, str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in orders.to_dict(orient="records"):
        source_sku = normalize_sku(row.get("sku"))
        canonical_sku = sku_map.get(source_sku, "")
        qty = parse_number(row.get("qty"))
        unit_price = parse_number(row.get("unit_price"))
        discount_pct = parse_number(row.get("discount_pct"))
        rows.append(
            {
                **row,
                "order_date": parse_date(row.get("order_date")),
                "customer_email": normalize_email(row.get("customer_email")),
                "source_sku": source_sku,
                "canonical_sku": canonical_sku,
                "qty": qty,
                "unit_price": unit_price,
                "discount_pct": discount_pct,
                "currency": normalize_currency(row.get("currency")),
                "shipping_country": normalize_country(row.get("shipping_country")),
                "revenue": round(qty * unit_price * (1 - discount_pct / 100), 2),
            }
        )
    return rows


def normalize_products(sku_master: pd.DataFrame) -> list[dict[str, Any]]:
    products: dict[str, dict[str, Any]] = {}
    for row in sku_master.to_dict(orient="records"):
        canonical = normalize_sku(row.get("canonical_sku"))
        if not canonical or canonical in products:
            continue
        products[canonical] = {
            "canonical_sku": canonical,
            "product_name": str(row.get("product_name", "")).strip(),
            "category": str(row.get("category", "")).strip(),
            "size": str(row.get("size", "")).strip(),
            "colour": str(row.get("colour", "")).strip(),
            "active": str(row.get("active", "true")).strip().lower() in {"true", "1", "yes"},
        }
    return list(products.values())


def normalize_inventory(inventory: pd.DataFrame, sku_map: dict[str, str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in inventory.to_dict(orient="records"):
        source_sku = normalize_sku(row.get("source_sku"))
        rows.append(
            {
                "snapshot_date": parse_date(row.get("snapshot_date")),
                "warehouse_id": str(row.get("warehouse_id", "")).strip(),
                "canonical_sku": sku_map.get(source_sku, ""),
                "source_sku": source_sku,
                "on_hand_qty": parse_number(row.get("on_hand_qty")),
                "reserved_qty": parse_number(row.get("reserved_qty")),
                "available_qty": parse_number(row.get("available_qty")),
                "reorder_point": parse_number(row.get("reorder_point")),
                "stock_status": str(row.get("stock_status", "")).strip().lower(),
            }
        )
    return rows


def normalize_warehouses(warehouses: pd.DataFrame) -> list[dict[str, Any]]:
    return [
        {
            "warehouse_id": str(row.get("warehouse_id", "")).strip(),
            "warehouse_name": str(row.get("warehouse_name", "")).strip(),
            "city": str(row.get("city", "")).strip(),
            "country_code": normalize_country(row.get("country_code")),
            "active": str(row.get("active", "true")).strip().lower() in {"true", "1", "yes"},
        }
        for row in warehouses.to_dict(orient="records")
    ]


def normalize_returns(returns: list[dict[str, Any]], sku_map: dict[str, str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for event in returns:
        refund = event.get("refund", {}) or {}
        for item in event.get("items", []):
            source_sku = normalize_sku(item.get("sku"))
            rows.append(
                {
                    "return_id": event.get("return_id", ""),
                    "order_id": event.get("order_id", ""),
                    "requested_at": parse_date(event.get("requested_at")),
                    "processed_at": parse_date(event.get("processed_at")),
                    "customer_email": normalize_email(event.get("customer_email")),
                    "source_sku": source_sku,
                    "canonical_sku": sku_map.get(source_sku, ""),
                    "qty_returned": parse_number(item.get("qty_returned")),
                    "reason_code": str(item.get("reason_code", "") or "").strip(),
                    "refund_amount": parse_number(refund.get("amount")),
                    "currency": normalize_currency(refund.get("currency")),
                }
            )
    return rows


def normalize_shipments(shipments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "shipment_id": item.get("shipment_id", ""),
            "order_id": item.get("order_id", ""),
            "warehouse_id": item.get("warehouse_id", ""),
            "carrier": item.get("carrier", ""),
            "tracking_number": item.get("tracking_number", "") or "",
            "status": str(item.get("status", "")).lower(),
            "shipped_at": parse_date(item.get("shipped_at")),
            "delivered_at": parse_date(item.get("delivered_at")),
            "shipping_cost": parse_number(item.get("shipping_cost")),
            "currency": normalize_currency(item.get("currency")),
        }
        for item in shipments
    ]
