from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_pipeline_run_exposes_status_and_summary_metrics():
    run_response = client.post("/pipeline/run")
    assert run_response.status_code == 200
    run_payload = run_response.json()
    assert run_payload["status"] == "completed"
    assert run_payload["totalRecords"] > 0
    assert run_payload["issueCount"] > 0

    status_response = client.get("/pipeline/status")
    assert status_response.status_code == 200
    assert status_response.json()["runId"] == run_payload["runId"]

    summary_response = client.get("/metrics/summary")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["totalRevenue"] > 0
    assert summary["dataQualityScore"] == run_payload["dqScore"]
    assert summary["cleanRecords"] > summary["rejectedRecords"]


def test_metrics_and_record_endpoints_return_dashboard_shapes():
    client.post("/pipeline/run")

    revenue = client.get("/metrics/revenue-by-month").json()
    assert revenue
    assert {"month", "revenue"} <= set(revenue[0])

    issues = client.get("/metrics/top-dq-issues").json()
    assert issues
    assert {"ruleId", "issue", "count", "severity"} <= set(issues[0])

    errors = client.get("/records/errors").json()
    assert errors
    assert {"sourceTable", "businessKey", "ruleId", "issue"} <= set(errors[0])

    orders = client.get("/records/orders").json()
    assert orders
    assert {"orderId", "customerId", "canonicalSku", "revenue"} <= set(orders[0])

    inventory_risk = client.get("/records/inventory-risk").json()
    assert inventory_risk
    assert {"warehouseId", "canonicalSku", "availableQty", "riskLevel"} <= set(inventory_risk[0])


def test_ai_data_quality_summary_is_portfolio_ready():
    client.post("/pipeline/run")

    response = client.get("/ai/data-quality-summary")
    assert response.status_code == 200
    payload = response.json()
    assert "UrbanThread Outfitters" in payload["headline"]
    assert payload["findings"]
    assert payload["recommendedActions"]
