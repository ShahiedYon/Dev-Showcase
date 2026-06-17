from app.pipeline.validate import detect_duplicates, validate_orders, validate_returns, validate_shipments


def valid_order(**overrides):
    row = {
        "order_id": "ORD-001",
        "order_line_id": "ORD-001-1",
        "order_date": "2026-05-01",
        "customer_id": "CUS-001",
        "source_sku": "SKU-ANI-001",
        "canonical_sku": "SKU-ANI-001",
        "qty": 2,
        "unit_price": 49.99,
        "discount_pct": 0,
        "currency": "USD",
        "order_status": "paid",
    }
    row.update(overrides)
    return row


def test_duplicate_detection_flags_repeated_business_key():
    issues = detect_duplicates(
        [{"order_line_id": "ORD-001-1"}, {"order_line_id": "ORD-001-1"}],
        "order_line_id",
        "sales_orders",
    )
    assert len(issues) == 1
    assert issues[0]["rule_id"] == "DQ008"


def test_required_field_validation_rejects_blank_order_id():
    clean, issues = validate_orders([valid_order(order_id="")])
    assert clean == []
    assert any(item["rule_id"] == "DQ001" and item["field_name"] == "order_id" for item in issues)


def test_return_quantity_validation_rejects_returns_greater_than_sold():
    returns = [
        {
            "return_id": "RET-001",
            "order_id": "ORD-001",
            "canonical_sku": "SKU-ANI-001",
            "qty_returned": 3,
            "reason_code": "too_small",
        }
    ]
    clean, issues = validate_returns(returns, [valid_order(qty=2)])
    assert clean == []
    assert any(item["rule_id"] == "DQ006" for item in issues)


def test_shipment_timeline_validation_rejects_delivery_before_shipping():
    shipments = [
        {
            "shipment_id": "SHP-001",
            "order_id": "ORD-001",
            "status": "delivered",
            "tracking_number": "TRACK-1",
            "shipped_at": "2026-05-10",
            "delivered_at": "2026-05-09",
        }
    ]
    clean, issues = validate_shipments(shipments, [valid_order()])
    assert clean == []
    assert any(item["rule_id"] == "DQ007" for item in issues)
