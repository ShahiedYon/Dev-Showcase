# Data dictionary

## `sales_orders_raw.csv`

- `order_id`: Order header identifier.
- `order_line_id`: Line identifier. Can contain duplicates.
- `order_date`: Mixed-format date from storefront systems.
- `customer_id`: Source customer identifier.
- `customer_name`: Customer display name.
- `customer_email`: Email, sometimes missing or inconsistently cased.
- `customer_phone`: Phone number, sometimes missing.
- `sku`: Product code, intentionally messy.
- `product_name`: Product display name.
- `category`: Product category.
- `qty`: Quantity sold. Can contain invalid values.
- `unit_price`: Unit price in source currency.
- `discount_pct`: Discount percentage. Can contain invalid values.
- `currency`: Currency code, sometimes missing or lowercase.
- `channel`: Sales source.
- `shipping_country`: Mixed country naming.
- `shipping_postal_code`: Postal code.
- `payment_status`: Payment state.
- `order_status`: Fulfillment/order state.
- `source_system`: Source export name.

## `warehouse_ops.xlsx`

Sheets:

- `inventory_snapshot`: Stock by SKU and warehouse.
- `sku_master`: SKU mapping from source SKU to canonical SKU.
- `purchase_orders`: Supplier orders and expected arrivals.
- `warehouse_lookup`: Warehouse metadata.

## `returns_refunds_raw.json`

Nested return events with return lines and refund details.

## `shipments_api_response.json`

Mock courier API response.

## `support_tickets_api_response.json`

Mock helpdesk API response.