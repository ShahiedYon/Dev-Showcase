from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
import json

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app import models
from app.database import PROJECT_ROOT
from app.pipeline.validate import month_key


def latest_run(session: Session) -> dict[str, object]:
    run = session.scalar(select(models.PipelineRunLog).order_by(desc(models.PipelineRunLog.finished_at)).limit(1))
    if run is None:
        return {
            "runId": "",
            "status": "not_run",
            "startedAt": "",
            "finishedAt": "",
            "totalRecords": 0,
            "cleanRecords": 0,
            "rejectedRecords": 0,
            "dqScore": 0,
        }
    return {
        "runId": run.run_id,
        "status": run.status,
        "startedAt": run.started_at.isoformat(),
        "finishedAt": run.finished_at.isoformat(),
        "totalRecords": run.total_records,
        "cleanRecords": run.clean_records,
        "rejectedRecords": run.rejected_records,
        "dqScore": run.dq_score,
    }


def summary_metrics(session: Session) -> dict[str, object]:
    run = latest_run(session)
    total_revenue = session.scalar(select(func.coalesce(func.sum(models.FactOrderLine.revenue), 0))) or 0
    order_count = session.scalar(select(func.count(func.distinct(models.FactOrderLine.order_id)))) or 0
    customer_count = session.scalar(select(func.count(models.DimCustomer.customer_id))) or 0
    issue_count = session.scalar(select(func.count(models.DQIssueLog.id))) or 0
    open_tickets = _count_open_support_tickets(PROJECT_ROOT / "data" / "raw" / "fake_api" / "support_tickets_api_response.json")
    inventory_risk_count = len(inventory_risk(session))
    return {
        "totalRevenue": round(float(total_revenue), 2),
        "orders": int(order_count),
        "customers": int(customer_count),
        "dataQualityScore": run["dqScore"],
        "cleanRecords": run["cleanRecords"],
        "rejectedRecords": run["rejectedRecords"],
        "issueCount": int(issue_count),
        "openSupportTickets": open_tickets,
        "inventoryRiskCount": inventory_risk_count,
        "latestRun": run,
    }


def revenue_by_month(session: Session) -> list[dict[str, object]]:
    rows = session.scalars(select(models.FactOrderLine)).all()
    revenue: defaultdict[str, float] = defaultdict(float)
    for row in rows:
        revenue[month_key(row.order_date)] += float(row.revenue or 0)
    return [{"month": month, "revenue": round(value, 2)} for month, value in sorted(revenue.items())]


def top_dq_issues(session: Session, limit: int = 8) -> list[dict[str, object]]:
    rows = session.scalars(select(models.DQIssueLog)).all()
    grouped: Counter[tuple[str, str, str]] = Counter((row.rule_id, row.issue, row.severity) for row in rows)
    return [
        {"ruleId": rule_id, "issue": text, "severity": severity, "count": count}
        for (rule_id, text, severity), count in grouped.most_common(limit)
    ]


def error_records(session: Session, limit: int = 50) -> list[dict[str, object]]:
    rows = session.scalars(select(models.DQIssueLog).order_by(desc(models.DQIssueLog.id)).limit(limit)).all()
    return [
        {
            "sourceTable": row.source_table,
            "businessKey": row.business_key,
            "ruleId": row.rule_id,
            "severity": row.severity,
            "fieldName": row.field_name,
            "issue": row.issue,
        }
        for row in rows
    ]


def order_records(session: Session, limit: int = 50) -> list[dict[str, object]]:
    rows = session.scalars(select(models.FactOrderLine).order_by(desc(models.FactOrderLine.order_date)).limit(limit)).all()
    return [
        {
            "orderId": row.order_id,
            "orderLineId": row.order_line_id,
            "orderDate": row.order_date,
            "customerId": row.customer_id,
            "canonicalSku": row.canonical_sku,
            "qty": row.qty,
            "currency": row.currency,
            "revenue": row.revenue,
            "status": row.order_status,
        }
        for row in rows
    ]


def inventory_risk(session: Session) -> list[dict[str, object]]:
    rows = session.scalars(select(models.FactInventorySnapshot)).all()
    risky = []
    for row in rows:
        available = float(row.available_qty or 0)
        reorder_point = float(row.reorder_point or 0)
        if available <= reorder_point:
            risky.append(
                {
                    "warehouseId": row.warehouse_id,
                    "canonicalSku": row.canonical_sku,
                    "availableQty": available,
                    "reorderPoint": reorder_point,
                    "stockStatus": row.stock_status,
                    "riskLevel": "critical" if available <= 0 else "watch",
                }
            )
    return sorted(risky, key=lambda item: (item["riskLevel"] != "critical", item["availableQty"]))


def ai_data_quality_summary(session: Session) -> dict[str, object]:
    summary = summary_metrics(session)
    issues = top_dq_issues(session, limit=5)
    risks = inventory_risk(session)[:5]
    score = float(summary["dataQualityScore"] or 0)
    posture = "usable with targeted remediation" if score >= 80 else "not yet trustworthy for executive reporting"
    findings = [
        f"Pipeline processed {summary['cleanRecords']} clean records and rejected {summary['rejectedRecords']} records.",
        f"Top quality pattern: {issues[0]['issue'] if issues else 'No active issues found.'}",
        f"Inventory watch list contains {summary['inventoryRiskCount']} SKU and warehouse combinations.",
        f"Open support tickets in the fake helpdesk feed: {summary['openSupportTickets']}.",
    ]
    actions = [
        "Fix unmapped SKU aliases before publishing revenue and return metrics.",
        "Review shipment timelines and cancelled-order shipment exceptions with warehouse operations.",
        "Add automated upstream checks for required fields, duplicate order lines, and inventory availability math.",
    ]
    if risks:
        actions.append(f"Prioritize replenishment review for {risks[0]['canonicalSku']} at {risks[0]['warehouseId']}.")
    return {
        "headline": f"UrbanThread Outfitters data is {posture}.",
        "score": score,
        "findings": findings,
        "recommendedActions": actions,
    }


def _count_open_support_tickets(path: Path) -> int:
    if not path.exists():
        return 0
    payload = json.loads(path.read_text(encoding="utf-8"))
    return sum(1 for ticket in payload.get("tickets", []) if str(ticket.get("status", "")).lower() != "closed")
