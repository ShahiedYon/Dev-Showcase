from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DimCustomer(Base):
    __tablename__ = "dim_customer"

    customer_id: Mapped[str] = mapped_column(String, primary_key=True)
    customer_name: Mapped[str] = mapped_column(String, default="")
    customer_email: Mapped[str] = mapped_column(String, default="")
    customer_phone: Mapped[str] = mapped_column(String, default="")
    country_code: Mapped[str] = mapped_column(String, default="")


class DimProduct(Base):
    __tablename__ = "dim_product"

    canonical_sku: Mapped[str] = mapped_column(String, primary_key=True)
    product_name: Mapped[str] = mapped_column(String, default="")
    category: Mapped[str] = mapped_column(String, default="")
    size: Mapped[str] = mapped_column(String, default="")
    colour: Mapped[str] = mapped_column(String, default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class DimWarehouse(Base):
    __tablename__ = "dim_warehouse"

    warehouse_id: Mapped[str] = mapped_column(String, primary_key=True)
    warehouse_name: Mapped[str] = mapped_column(String, default="")
    city: Mapped[str] = mapped_column(String, default="")
    country_code: Mapped[str] = mapped_column(String, default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class FactOrderLine(Base):
    __tablename__ = "fact_order_line"

    order_line_id: Mapped[str] = mapped_column(String, primary_key=True)
    order_id: Mapped[str] = mapped_column(String, index=True)
    order_date: Mapped[str] = mapped_column(String, default="")
    customer_id: Mapped[str] = mapped_column(String, default="")
    canonical_sku: Mapped[str] = mapped_column(String, default="")
    qty: Mapped[float] = mapped_column(Float, default=0)
    unit_price: Mapped[float] = mapped_column(Float, default=0)
    discount_pct: Mapped[float] = mapped_column(Float, default=0)
    currency: Mapped[str] = mapped_column(String, default="")
    channel: Mapped[str] = mapped_column(String, default="")
    shipping_country: Mapped[str] = mapped_column(String, default="")
    payment_status: Mapped[str] = mapped_column(String, default="")
    order_status: Mapped[str] = mapped_column(String, default="")
    revenue: Mapped[float] = mapped_column(Float, default=0)


class FactReturn(Base):
    __tablename__ = "fact_return"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    return_id: Mapped[str] = mapped_column(String, index=True)
    order_id: Mapped[str] = mapped_column(String, index=True)
    requested_at: Mapped[str] = mapped_column(String, default="")
    processed_at: Mapped[str] = mapped_column(String, default="")
    canonical_sku: Mapped[str] = mapped_column(String, default="")
    qty_returned: Mapped[float] = mapped_column(Float, default=0)
    reason_code: Mapped[str] = mapped_column(String, default="")
    refund_amount: Mapped[float] = mapped_column(Float, default=0)
    currency: Mapped[str] = mapped_column(String, default="")


class FactShipment(Base):
    __tablename__ = "fact_shipment"

    shipment_id: Mapped[str] = mapped_column(String, primary_key=True)
    order_id: Mapped[str] = mapped_column(String, index=True)
    warehouse_id: Mapped[str] = mapped_column(String, default="")
    carrier: Mapped[str] = mapped_column(String, default="")
    tracking_number: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="")
    shipped_at: Mapped[str] = mapped_column(String, default="")
    delivered_at: Mapped[str] = mapped_column(String, default="")
    shipping_cost: Mapped[float] = mapped_column(Float, default=0)
    currency: Mapped[str] = mapped_column(String, default="")


class FactInventorySnapshot(Base):
    __tablename__ = "fact_inventory_snapshot"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    snapshot_date: Mapped[str] = mapped_column(String, default="")
    warehouse_id: Mapped[str] = mapped_column(String, index=True)
    canonical_sku: Mapped[str] = mapped_column(String, index=True)
    on_hand_qty: Mapped[float] = mapped_column(Float, default=0)
    reserved_qty: Mapped[float] = mapped_column(Float, default=0)
    available_qty: Mapped[float] = mapped_column(Float, default=0)
    reorder_point: Mapped[float] = mapped_column(Float, default=0)
    stock_status: Mapped[str] = mapped_column(String, default="")


class DQIssueLog(Base):
    __tablename__ = "dq_issue_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String, index=True)
    source_table: Mapped[str] = mapped_column(String, index=True)
    business_key: Mapped[str] = mapped_column(String, default="")
    rule_id: Mapped[str] = mapped_column(String, index=True)
    severity: Mapped[str] = mapped_column(String, default="medium")
    field_name: Mapped[str] = mapped_column(String, default="")
    issue: Mapped[str] = mapped_column(Text, default="")
    raw_payload: Mapped[str] = mapped_column(Text, default="")


class PipelineRunLog(Base):
    __tablename__ = "pipeline_run_log"

    run_id: Mapped[str] = mapped_column(String, primary_key=True)
    status: Mapped[str] = mapped_column(String, default="completed")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC).replace(tzinfo=None))
    finished_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC).replace(tzinfo=None))
    total_records: Mapped[int] = mapped_column(Integer, default=0)
    clean_records: Mapped[int] = mapped_column(Integer, default=0)
    rejected_records: Mapped[int] = mapped_column(Integer, default=0)
    dq_score: Mapped[float] = mapped_column(Float, default=0)
