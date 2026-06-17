from __future__ import annotations

from uuid import uuid4

from app.database import SessionLocal, reset_database
from app.pipeline.extract import extract_sources
from app.pipeline.load import load_dimensions, load_facts, load_issues, load_run_log
from app.pipeline.normalize import (
    build_sku_map,
    normalize_inventory,
    normalize_orders,
    normalize_products,
    normalize_returns,
    normalize_shipments,
    normalize_warehouses,
)
from app.pipeline.validate import validate_inventory, validate_orders, validate_returns, validate_shipments


def run_pipeline() -> dict[str, object]:
    run_id = uuid4().hex[:12]
    reset_database()
    sources = extract_sources()
    sku_map = build_sku_map(sources["sku_master"])

    orders = normalize_orders(sources["orders"], sku_map)
    products = normalize_products(sources["sku_master"])
    warehouses = normalize_warehouses(sources["warehouses"])
    inventory = normalize_inventory(sources["inventory"], sku_map)
    returns = normalize_returns(sources["returns"], sku_map)
    shipments = normalize_shipments(sources["shipments"])

    clean_orders, order_issues = validate_orders(orders)
    clean_returns, return_issues = validate_returns(returns, orders)
    clean_shipments, shipment_issues = validate_shipments(shipments, orders)
    clean_inventory, inventory_issues = validate_inventory(inventory)

    issues = order_issues + return_issues + shipment_issues + inventory_issues
    total = len(orders) + len(returns) + len(shipments) + len(inventory)
    clean = len(clean_orders) + len(clean_returns) + len(clean_shipments) + len(clean_inventory)
    rejected = total - clean

    with SessionLocal() as session:
        load_dimensions(session, products, warehouses, clean_orders)
        load_facts(session, clean_orders, clean_returns, clean_shipments, clean_inventory)
        load_issues(session, run_id, issues)
        load_run_log(session, run_id, total, clean, rejected)
        session.commit()

    return {
        "runId": run_id,
        "status": "completed",
        "totalRecords": total,
        "cleanRecords": clean,
        "rejectedRecords": rejected,
        "issueCount": len(issues),
        "dqScore": round((clean / total) * 100, 1) if total else 0,
    }
