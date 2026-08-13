export const sourceFiles = [
  { key: "sales_orders", name: "sales_orders_raw.csv", type: "CSV", domain: "Orders", detail: "Storefront order lines, customers and revenue" },
  { key: "inventory_snapshot", name: "warehouse_ops.xlsx", type: "Excel", domain: "Inventory", detail: "SKU master, warehouses and stock snapshots" },
  { key: "returns", name: "returns_refunds_raw.json", type: "JSON", domain: "Returns", detail: "Nested return items and refund values" },
  { key: "shipments", name: "shipments_api_response.json", type: "API", domain: "Shipments", detail: "Courier status, tracking and event dates" },
  { key: "support_tickets", name: "support_tickets_api_response.json", type: "API", domain: "Support", detail: "Open operational issues and context" },
];

export const fieldMappings = [
  { source: "Storefront CSV", field: "order_id + line_id", transformation: "Trim; uppercase; compose business key", target: "fact_order_line.order_line_key", control: "ORD-002" },
  { source: "Storefront CSV", field: "order_date", transformation: "Parse DD/MM/YYYY and ISO; output ISO date", target: "fact_order_line.order_date", control: "ORD-001" },
  { source: "Storefront CSV", field: "customer_email", transformation: "Trim; lowercase; validate format", target: "dim_customer.email", control: "ORD-001" },
  { source: "Storefront CSV", field: "sku", transformation: "Uppercase; map legacy aliases to canonical SKU", target: "dim_product.sku", control: "ORD-003" },
  { source: "Storefront CSV", field: "quantity", transformation: "Parse integer; require positive value", target: "fact_order_line.quantity", control: "ORD-004" },
  { source: "Storefront CSV", field: "unit_price", transformation: "Remove symbols; decimal(12,2); require > 0", target: "fact_order_line.unit_price", control: "ORD-005" },
  { source: "Storefront CSV", field: "discount_pct", transformation: "Parse decimal; constrain to 0–100", target: "fact_order_line.discount_pct", control: "ORD-006" },
  { source: "Storefront CSV", field: "currency", transformation: "Trim; uppercase; validate ISO currency", target: "fact_order_line.currency", control: "ORD-007" },
  { source: "Warehouse Excel", field: "SKU Alias", transformation: "Lookup against alias-to-canonical mapping", target: "dim_product.sku", control: "INV-001" },
  { source: "Warehouse Excel", field: "Warehouse Code", transformation: "Trim; uppercase; validate warehouse lookup", target: "dim_warehouse.warehouse_code", control: "INV-002" },
  { source: "Warehouse Excel", field: "On Hand / Reserved", transformation: "Parse integer; derive expected availability", target: "fact_inventory_snapshot.available_qty", control: "INV-003" },
  { source: "Returns JSON", field: "returns[].items[].sku", transformation: "Flatten item array; canonical SKU lookup", target: "fact_return.sku", control: "RET-001" },
  { source: "Returns JSON", field: "quantity", transformation: "Parse integer; compare with accepted sold quantity", target: "fact_return.return_qty", control: "RET-002" },
  { source: "Returns JSON", field: "reason", transformation: "Trim; require controlled reason value", target: "fact_return.reason", control: "RET-003" },
  { source: "Courier API", field: "shipped_at / delivered_at", transformation: "Parse timestamps; compare event sequence", target: "fact_shipment.shipped_at / delivered_at", control: "SHP-001" },
  { source: "Courier API", field: "tracking_number", transformation: "Trim; require when status is Delivered", target: "fact_shipment.tracking_number", control: "SHP-002" },
  { source: "Courier API", field: "order_status", transformation: "Compare order and shipment terminal states", target: "fact_shipment.order_status", control: "SHP-003" },
  { source: "Helpdesk API", field: "tickets[].status", transformation: "Normalise case; derive open-ticket context", target: "support_ticket.status", control: "SUP-001" },
];

export const qualityRules = [
  { id: "ORD-001", domain: "orders", severity: "high", rule: "Required order fields are present and valid.", remediation: "Complete the required source fields before reprocessing." },
  { id: "ORD-002", domain: "orders", severity: "high", rule: "Order-line business key is unique.", remediation: "Remove or consolidate duplicate order lines." },
  { id: "ORD-003", domain: "orders", severity: "high", rule: "Source SKU maps to the canonical product master.", remediation: "Add or correct the SKU alias mapping." },
  { id: "ORD-004", domain: "orders", severity: "high", rule: "Quantity is a positive whole number.", remediation: "Correct the order quantity in the source." },
  { id: "ORD-005", domain: "orders", severity: "high", rule: "Unit price is greater than zero.", remediation: "Correct the price or remove the invalid row." },
  { id: "ORD-006", domain: "orders", severity: "medium", rule: "Discount percentage is between 0 and 100.", remediation: "Correct the discount percentage." },
  { id: "ORD-007", domain: "orders", severity: "medium", rule: "Currency is a supported ISO code.", remediation: "Map the currency to USD, ZAR, GBP or EUR." },
  { id: "INV-001", domain: "inventory", severity: "high", rule: "Inventory SKU maps to the canonical product master.", remediation: "Add or correct the warehouse SKU alias." },
  { id: "INV-002", domain: "inventory", severity: "high", rule: "Warehouse code exists in the location master.", remediation: "Correct the warehouse code or update the master." },
  { id: "INV-003", domain: "inventory", severity: "medium", rule: "Available equals on-hand minus reserved.", remediation: "Recalculate the snapshot and confirm reservations." },
  { id: "RET-001", domain: "returns", severity: "high", rule: "Return SKU maps to a canonical product.", remediation: "Correct the return SKU or its alias mapping." },
  { id: "RET-002", domain: "returns", severity: "high", rule: "Return quantity does not exceed accepted sold quantity.", remediation: "Verify the return against the original order line." },
  { id: "RET-003", domain: "returns", severity: "medium", rule: "Return reason is present.", remediation: "Capture a valid return reason." },
  { id: "SHP-001", domain: "shipments", severity: "high", rule: "Delivered timestamp is not before shipped timestamp.", remediation: "Correct the courier event sequence." },
  { id: "SHP-002", domain: "shipments", severity: "high", rule: "Delivered shipment includes a tracking number.", remediation: "Supply the carrier tracking reference." },
  { id: "SHP-003", domain: "shipments", severity: "medium", rule: "Cancelled order does not have a delivered shipment.", remediation: "Reconcile the order and courier terminal states." },
];

const productAliases = {
  "HDY-01": "SKU-HDY-001",
  "SKU-HDY-001": "SKU-HDY-001",
  "TEE-BLK": "SKU-TEE-001",
  "SKU-TEE-001": "SKU-TEE-001",
  "MUG-WHT": "SKU-MUG-001",
  "SKU-MUG-001": "SKU-MUG-001",
  "CAP-NVY": "SKU-CAP-001",
  "SKU-CAP-001": "SKU-CAP-001",
  "SOCK-01": "SKU-SOC-001",
  "SKU-SOC-001": "SKU-SOC-001",
};

export const canonicalSku = (value) => productAliases[String(value || "").trim().toUpperCase()] || null;

export const sourceCsv = `order_id,line_id,order_date,customer_email,sku,quantity,unit_price,discount_pct,currency,order_status
ORD-2001,1,01/08/2026,anna@example.com,HDY-01,2,899.00,10,ZAR,Completed
ORD-2002,1,2026-08-01,ben@example.com,TEE-BLK,3,249.50,0,ZAR,Completed
ORD-2003,1,02/08/2026,carla@example.com,MUG-WHT,4,129.99,5,ZAR,Completed
ORD-2004,1,2026-08-03,diego@example.com,CAP-NVY,2,299.00,0,ZAR,Completed
ORD-2005,1,04/08/2026,ellen@example.com,SOCK-01,5,89.00,0,ZAR,Completed
ORD-2006,1,2026-08-04,farah@example.com,HDY-01,1,899.00,15,ZAR,Completed
ORD-2007,1,05/08/2026,gavin@example.com,TEE-BLK,2,249.50,0,ZAR,Completed
ORD-2008,1,2026-08-05,hana@example.com,MUG-WHT,1,129.99,0,ZAR,Completed
ORD-2008,1,2026-08-05,hana@example.com,MUG-WHT,1,129.99,0,ZAR,Completed
ORD-2009,1,06/08/2026,isaac@example.com,UNKNOWN-9,1,499.00,0,ZAR,Completed
ORD-2010,1,2026-08-06,jade@example.com,CAP-NVY,0,299.00,0,ZAR,Completed
ORD-2011,1,07/08/2026,kabelo@example.com,HDY-01,1,-50.00,0,ZAR,Completed
ORD-2012,1,2026-08-07,lena@example.com,TEE-BLK,2,249.50,115,ZAR,Completed
ORD-2013,1,08/08/2026,,MUG-WHT,2,129.99,0,ZAR,Completed
ORD-2014,1,2026-08-08,omar@example.com,SOCK-01,4,89.00,0,ZZZ,Completed
ORD-2015,1,09/08/2026,pam@example.com,HDY-01,2,899.00,0,ZAR,Cancelled
ORD-2016,1,2026-08-09,quinn@example.com,CAP-NVY,1,299.00,0,ZAR,Completed
ORD-2017,1,10/08/2026,ravi@example.com,TEE-BLK,2,249.50,0,ZAR,Completed`;

export const workbookSheets = {
  sku_master: [
    { "SKU Alias": "HDY-01", "Canonical SKU": "SKU-HDY-001", "Product Name": "Everyday Hoodie" },
    { "SKU Alias": "TEE-BLK", "Canonical SKU": "SKU-TEE-001", "Product Name": "Essential Tee" },
    { "SKU Alias": "MUG-WHT", "Canonical SKU": "SKU-MUG-001", "Product Name": "Studio Mug" },
    { "SKU Alias": "CAP-NVY", "Canonical SKU": "SKU-CAP-001", "Product Name": "Field Cap" },
    { "SKU Alias": "SOCK-01", "Canonical SKU": "SKU-SOC-001", "Product Name": "Crew Socks" },
  ],
  warehouse_lookup: [
    { "Warehouse Code": "WH-CPT", "Warehouse Name": "Cape Town Distribution" },
    { "Warehouse Code": "WH-JHB", "Warehouse Name": "Johannesburg Distribution" },
    { "Warehouse Code": "WH-DBN", "Warehouse Name": "Durban Distribution" },
  ],
  inventory_snapshot: [
    { "SKU Alias": "HDY-01", "Warehouse Code": "WH-CPT", "On Hand": 35, Reserved: 12, Available: 23, "Reorder Point": 20 },
    { "SKU Alias": "TEE-BLK", "Warehouse Code": "WH-JHB", "On Hand": 18, Reserved: 9, Available: 9, "Reorder Point": 15 },
    { "SKU Alias": "MUG-WHT", "Warehouse Code": "WH-DBN", "On Hand": 24, Reserved: 5, Available: 19, "Reorder Point": 12 },
    { "SKU Alias": "CAP-NVY", "Warehouse Code": "WH-CPT", "On Hand": 8, Reserved: 3, Available: 7, "Reorder Point": 10 },
    { "SKU Alias": "UNKNOWN-WH", "Warehouse Code": "WH-CPT", "On Hand": 12, Reserved: 2, Available: 10, "Reorder Point": 5 },
    { "SKU Alias": "SOCK-01", "Warehouse Code": "WH-XXX", "On Hand": 20, Reserved: 5, Available: 15, "Reorder Point": 8 },
  ],
};

export const returnsJson = {
  returns: [
    { return_id: "RET-301", order_id: "ORD-2001", received_at: "2026-08-06", items: [{ sku: "HDY-01", quantity: 1, refund_amount: 809.10, reason: "Size" }] },
    { return_id: "RET-302", order_id: "ORD-2002", received_at: "2026-08-07", items: [{ sku: "TEE-BLK", quantity: 4, refund_amount: 998.00, reason: "Fit" }] },
    { return_id: "RET-303", order_id: "ORD-2003", received_at: "2026-08-08", items: [{ sku: "MUG-WHT", quantity: 1, refund_amount: 123.49, reason: "" }] },
    { return_id: "RET-304", order_id: "ORD-2004", received_at: "2026-08-09", items: [{ sku: "NO-MAP", quantity: 1, refund_amount: 299.00, reason: "Damaged" }] },
  ],
};

export const shipmentsApi = {
  status: 200,
  data: [
    { shipment_id: "SHP-401", order_id: "ORD-2001", tracking_number: "CT-77821", status: "Delivered", shipped_at: "2026-08-02T09:00:00Z", delivered_at: "2026-08-04T13:00:00Z", order_status: "Completed" },
    { shipment_id: "SHP-402", order_id: "ORD-2002", tracking_number: "", status: "Delivered", shipped_at: "2026-08-03T09:00:00Z", delivered_at: "2026-08-05T12:00:00Z", order_status: "Completed" },
    { shipment_id: "SHP-403", order_id: "ORD-2003", tracking_number: "DB-33109", status: "Delivered", shipped_at: "2026-08-06T09:00:00Z", delivered_at: "2026-08-05T12:00:00Z", order_status: "Completed" },
    { shipment_id: "SHP-404", order_id: "ORD-2015", tracking_number: "JH-88211", status: "Delivered", shipped_at: "2026-08-10T09:00:00Z", delivered_at: "2026-08-11T12:00:00Z", order_status: "Cancelled" },
    { shipment_id: "SHP-405", order_id: "ORD-2004", tracking_number: "CT-99318", status: "In transit", shipped_at: "2026-08-06T09:00:00Z", delivered_at: "", order_status: "Completed" },
  ],
};

export const supportApi = {
  status: 200,
  tickets: [
    { ticket_id: "TKT-501", order_id: "ORD-2009", status: "Open", category: "Product mapping" },
    { ticket_id: "TKT-502", order_id: "ORD-2002", status: "Open", category: "Shipment tracking" },
    { ticket_id: "TKT-503", order_id: "ORD-2007", status: "Resolved", category: "Delivery confirmation" },
  ],
};
