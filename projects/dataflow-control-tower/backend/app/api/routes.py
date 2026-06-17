from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.pipeline.run_pipeline import run_pipeline
from app.services import metrics_service


router = APIRouter()


def get_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@router.post("/pipeline/run")
def run_data_pipeline() -> dict[str, object]:
    return run_pipeline()


@router.get("/pipeline/status")
def pipeline_status(session: Session = Depends(get_session)) -> dict[str, object]:
    return metrics_service.latest_run(session)


@router.get("/metrics/summary")
def metrics_summary(session: Session = Depends(get_session)) -> dict[str, object]:
    return metrics_service.summary_metrics(session)


@router.get("/metrics/revenue-by-month")
def metrics_revenue_by_month(session: Session = Depends(get_session)) -> list[dict[str, object]]:
    return metrics_service.revenue_by_month(session)


@router.get("/metrics/top-dq-issues")
def metrics_top_dq_issues(session: Session = Depends(get_session)) -> list[dict[str, object]]:
    return metrics_service.top_dq_issues(session)


@router.get("/records/errors")
def records_errors(session: Session = Depends(get_session)) -> list[dict[str, object]]:
    return metrics_service.error_records(session)


@router.get("/records/orders")
def records_orders(session: Session = Depends(get_session)) -> list[dict[str, object]]:
    return metrics_service.order_records(session)


@router.get("/records/inventory-risk")
def records_inventory_risk(session: Session = Depends(get_session)) -> list[dict[str, object]]:
    return metrics_service.inventory_risk(session)


@router.get("/ai/data-quality-summary")
def ai_data_quality_summary(session: Session = Depends(get_session)) -> dict[str, object]:
    return metrics_service.ai_data_quality_summary(session)
