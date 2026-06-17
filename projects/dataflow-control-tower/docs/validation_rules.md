# Validation Rules

The data quality checks are configured in `dq_rules.yaml` and applied in `backend/app/pipeline/validate.py`.

| Rule | Purpose | Severity |
| --- | --- | --- |
| DQ001 | Required fields cannot be blank | High |
| DQ002 | Quantity must be greater than zero | High |
| DQ003 | Unit price must be greater than zero | High |
| DQ004 | Discount must be between 0 and 100 | Medium |
| DQ005 | SKU must map to canonical SKU | High |
| DQ006 | Return quantity cannot exceed sold quantity | High |
| DQ007 | Delivered date cannot be before shipped date | High |
| DQ008 | Duplicate business keys must be flagged | Medium |
| DQ009 | Cancelled orders should not have delivered shipments | Medium |
| DQ010 | Available inventory should equal on-hand minus reserved | Medium |

## Why These Rules Matter

- Revenue is unreliable if order lines are duplicated, missing prices, or unmapped to valid SKUs.
- Return metrics are unreliable if returned quantity exceeds sold quantity.
- Fulfillment metrics are unreliable if delivered dates occur before shipped dates.
- Inventory reporting is unreliable if available stock does not reconcile to on-hand minus reserved units.
- Executive dashboards should separate clean records from rejected records so leaders can see both business performance and confidence level.
