from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app import models


def load_dimensions(session: Session, products: list[dict[str, Any]], warehouses: list[dict[str, Any]], orders: list[dict[str, Any]]) -> None:
    for product in products:
        session.merge(models.DimProduct(**product))
    for warehouse in warehouses:
        session.merge(models.DimWarehouse(**warehouse))
    customers = {}
    for row in orders:
        customers[row["customer_id"]] = {
            "customer_id": row["customer_id"],
            "customer_name": row.get("customer_name", ""),
            "customer_email": row.get("customer_email", ""),
            "customer_phone": row.get("customer_phone", ""),
            "country_code": row.get("shipping_country", ""),
        }
    for customer in customers.values():
        session.merge(models.DimCustomer(**customer))


def load_facts(
    session: Session,
    orders: list[dict[str, Any]],
    returns: list[dict[str, Any]],
    shipments: list[dict[str, Any]],
    inventory: list[dict[str, Any]],
) -> None:
    for row in orders:
        session.merge(models.FactOrderLine(**_filter(row, models.FactOrderLine)))
    for row in returns:
        session.add(models.FactReturn(**_filter(row, models.FactReturn)))
    for row in shipments:
        session.merge(models.FactShipment(**_filter(row, models.FactShipment)))
    for row in inventory:
        session.add(models.FactInventorySnapshot(**_filter(row, models.FactInventorySnapshot)))


def load_issues(session: Session, run_id: str, issues: list[dict[str, Any]]) -> None:
    for item in issues:
        session.add(models.DQIssueLog(run_id=run_id, **item))


def load_run_log(session: Session, run_id: str, total: int, clean: int, rejected: int) -> None:
    dq_score = round((clean / total) * 100, 1) if total else 0
    now = datetime.now(UTC).replace(tzinfo=None)
    session.add(
        models.PipelineRunLog(
            run_id=run_id,
            status="completed",
            started_at=now,
            finished_at=now,
            total_records=total,
            clean_records=clean,
            rejected_records=rejected,
            dq_score=dq_score,
        )
    )


def _filter(row: dict[str, Any], model: type) -> dict[str, Any]:
    columns = set(model.__table__.columns.keys())
    return {key: value for key, value in row.items() if key in columns and key != "id"}
