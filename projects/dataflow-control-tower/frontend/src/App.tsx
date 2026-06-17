import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  DatabaseZap,
  FileJson,
  FileSpreadsheet,
  Gauge,
  Layers3,
  ListChecks,
  PackageSearch,
  RefreshCw,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  TableProperties,
  Truck,
  Wrench,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AISummary,
  DQIssue,
  ErrorRecord,
  InventoryRisk,
  OrderRecord,
  RevenuePoint,
  SummaryMetrics,
  getDashboardData,
  runPipeline,
} from "./api/client";

type DashboardData = {
  summary: SummaryMetrics;
  revenue: RevenuePoint[];
  issues: DQIssue[];
  errors: ErrorRecord[];
  orders: OrderRecord[];
  inventoryRisk: InventoryRisk[];
  aiSummary: AISummary;
};

type NavId = "control" | "pipeline" | "revenue" | "inventory" | "shipments" | "sources";

const navItems = [
  { id: "control", label: "Control Tower", icon: Gauge },
  { id: "pipeline", label: "Pipeline Runs", icon: DatabaseZap },
  { id: "revenue", label: "Revenue Quality", icon: BarChart3 },
  { id: "inventory", label: "Inventory Risk", icon: Boxes },
  { id: "shipments", label: "Shipment Checks", icon: Truck },
  { id: "sources", label: "Source Files", icon: FileJson },
] satisfies Array<{ id: NavId; label: string; icon: typeof Gauge }>;

const pageCopy: Record<NavId, { eyebrow: string; title: string; description: string }> = {
  control: {
    eyebrow: "UrbanThread Outfitters",
    title: "DataFlow Control Tower",
    description: "Validate revenue, inventory, returns, fulfillment, and support signals from fragmented ecommerce systems.",
  },
  pipeline: {
    eyebrow: "Pipeline Story",
    title: "From raw files to trusted tables",
    description: "Follow the ETL path: extract each source, normalize messy fields, validate rules, reject bad rows, then publish dashboard-ready metrics.",
  },
  revenue: {
    eyebrow: "Revenue Quality",
    title: "How we made revenue reportable",
    description: "See how clean order lines become monthly revenue while bad rows are held back by required-field, duplicate, price, and SKU checks.",
  },
  inventory: {
    eyebrow: "Inventory Risk",
    title: "Stock signals after reconciliation",
    description: "Trace the warehouse workbook into inventory snapshots, availability checks, and SKU-level risk flags for operational review.",
  },
  shipments: {
    eyebrow: "Shipment Checks",
    title: "Fulfillment exceptions made visible",
    description: "Validate courier events against order status, tracking numbers, and shipped-versus-delivered timelines.",
  },
  sources: {
    eyebrow: "Source Files",
    title: "The messy inputs we started with",
    description: "Show the fragmented ecommerce systems before cleaning: storefront CSV, warehouse Excel, returns JSON, courier API, and helpdesk API.",
  },
};

const sourceFiles = [
  {
    icon: FileSpreadsheet,
    name: "Storefront CSV",
    file: "sales_orders_raw.csv",
    role: "Revenue, customers, SKUs, payment status",
    issues: "Duplicate order lines, missing fields, mixed dates, bad prices",
  },
  {
    icon: TableProperties,
    name: "Warehouse Excel",
    file: "warehouse_ops.xlsx",
    role: "Inventory snapshot, SKU master, warehouse lookup",
    issues: "Unmapped SKU aliases and availability math mismatches",
  },
  {
    icon: FileJson,
    name: "Returns JSON",
    file: "returns_refunds_raw.json",
    role: "Nested return items and refund amounts",
    issues: "Return quantities greater than sold quantity",
  },
  {
    icon: Truck,
    name: "Courier API",
    file: "shipments_api_response.json",
    role: "Shipment status, tracking, shipped and delivered dates",
    issues: "Timeline errors and cancelled orders with delivered shipments",
  },
  {
    icon: ServerCog,
    name: "Helpdesk API",
    file: "support_tickets_api_response.json",
    role: "Open customer support issues",
    issues: "Operational context for data quality confidence",
  },
];

const pipelineSteps = [
  {
    icon: FileJson,
    title: "1. Extract fragmented sources",
    text: "Load CSV, Excel sheets, nested returns JSON, courier API JSON, and support ticket API JSON.",
  },
  {
    icon: Wrench,
    title: "2. Normalize messy fields",
    text: "Standardize dates, SKUs, emails, country codes, currency, quantities, prices, and discount values.",
  },
  {
    icon: ListChecks,
    title: "3. Validate business rules",
    text: "Flag missing required fields, duplicates, invalid quantities, unmapped SKUs, shipment timeline errors, and inventory mismatches.",
  },
  {
    icon: Layers3,
    title: "4. Load clean canonical tables",
    text: "Write trusted rows into dimensions and fact tables while rejected records land in the data quality issue log.",
  },
  {
    icon: BarChart3,
    title: "5. Publish decision metrics",
    text: "Expose revenue, quality score, issue patterns, inventory risk, and an executive-style data quality brief through FastAPI.",
  },
];

const issueColors = ["#2563eb", "#06b6d4", "#8b5cf6", "#f97316", "#ec4899", "#14b8a6"];

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState<NavId>("control");
  const initialized = useRef(false);
  const currentCopy = pageCopy[activeView];

  async function loadDashboard(runFirst = false) {
    setError("");
    setLoading(true);
    try {
      if (runFirst) {
        setRunning(true);
        await runPipeline();
      }
      setData(await getDashboardData());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load dashboard data.");
    } finally {
      setRunning(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void loadDashboard(true);
  }, []);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">
            <span />
          </div>
          <div>
            <strong>DataFlow</strong>
            <small>Control Tower</small>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                aria-current={activeView === item.id ? "page" : undefined}
                className={activeView === item.id ? "nav-item active" : "nav-item"}
                key={item.label}
                onClick={() => setActiveView(item.id)}
                type="button"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="source-card">
          <ShieldCheck size={28} />
          <div>
            <strong>Portfolio Build</strong>
            <span>CSV + Excel + JSON + API-style feeds</span>
          </div>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="search-box">
            <Search size={18} />
            <span>Search orders, SKUs, issues...</span>
            <kbd>Ctrl K</kbd>
          </div>
          <div className="top-actions">
            <span className="status-pill">
              <span />
              API connected
            </span>
            <button className="primary-button" disabled={running || loading} onClick={() => void loadDashboard(true)}>
              <RefreshCw size={18} className={running ? "spin" : ""} />
              {running ? "Running" : "Run Pipeline"}
            </button>
          </div>
        </header>

        <section className="page-heading">
          <div>
            <span className="eyebrow">{currentCopy.eyebrow}</span>
            <h1>{currentCopy.title}</h1>
            <p>{currentCopy.description}</p>
          </div>
          {data && <QualityDial score={data.summary.dataQualityScore} />}
        </section>

        {error && (
          <div className="error-banner">
            <AlertTriangle size={18} />
            <span>Backend unavailable: {error}. Start FastAPI on port 8010 and refresh.</span>
          </div>
        )}

        {loading && !data ? (
          <div className="loading-panel">
            <RefreshCw className="spin" size={28} />
            <span>Running the control tower pipeline...</span>
          </div>
        ) : data ? (
          <Dashboard activeView={activeView} data={data} />
        ) : null}
      </section>
    </main>
  );
}

function Dashboard({ activeView, data }: { activeView: NavId; data: DashboardData }) {
  if (activeView === "pipeline") return <PipelineRunsView data={data} />;
  if (activeView === "revenue") return <RevenueQualityView data={data} />;
  if (activeView === "inventory") return <InventoryRiskView data={data} />;
  if (activeView === "shipments") return <ShipmentChecksView data={data} />;
  if (activeView === "sources") return <SourceFilesView data={data} />;
  return <ControlTowerView data={data} />;
}

function ControlTowerView({ data }: { data: DashboardData }) {
  return (
    <>
      <section className="hero-grid">
        <article className="featured-card">
          <div className="hero-copy">
            <span className="featured-pill">Live pipeline</span>
            <h2>Messy retail data to trusted operational metrics</h2>
            <p>{data.aiSummary.headline}</p>
            <div className="hero-stats">
              <Stat value={data.summary.cleanRecords.toLocaleString()} label="Clean records" />
              <Stat value={data.summary.rejectedRecords.toLocaleString()} label="Rejected records" />
              <Stat value={data.summary.issueCount.toLocaleString()} label="DQ issues" />
              <Stat value={`$${data.summary.totalRevenue.toLocaleString()}`} label="Trusted revenue" />
            </div>
          </div>
          <div className="flow-graphic" aria-hidden="true">
            <div className="light-beam one" />
            <div className="light-beam two" />
            <div className="node node-a">
              <FileJson size={28} />
            </div>
            <div className="node node-b">
              <DatabaseZap size={28} />
            </div>
            <div className="node node-c">
              <ShieldCheck size={28} />
            </div>
            <div className="node node-d">
              <Sparkles size={28} />
            </div>
            <svg viewBox="0 0 420 260" className="flow-lines">
              <path d="M85 112 C160 112 145 42 216 42 S260 112 326 112" />
              <path d="M136 183 C190 183 178 125 234 125 S274 184 348 184" />
            </svg>
          </div>
        </article>

        <aside className="insight-card">
          <div className="section-title">
            <Sparkles size={18} />
            <h3>AI-style quality brief</h3>
          </div>
          <ul>
            {data.aiSummary.findings.map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="kpi-grid">
        <KpiCard icon={ClipboardList} label="Orders" value={data.summary.orders.toLocaleString()} trend="Canonical order lines loaded" />
        <KpiCard icon={PackageSearch} label="Inventory Risk" value={data.summary.inventoryRiskCount.toString()} trend="SKU and warehouse watch list" />
        <KpiCard icon={ServerCog} label="Open Tickets" value={data.summary.openSupportTickets.toString()} trend="Support feed still active" />
        <KpiCard icon={CheckCircle2} label="DQ Score" value={`${data.summary.dataQualityScore}%`} trend="Clean records divided by total records" />
      </section>

      <section className="analytics-grid">
        <ChartPanel title="Revenue By Month" subtitle="Validated order revenue from canonical fact rows">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.revenue}>
              <defs>
                <linearGradient id="revenue" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbe6fb" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fill="url(#revenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Top Data Quality Issues" subtitle="Most frequent validation failures by rule">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.issues} layout="vertical" margin={{ left: 20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbe6fb" />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis dataKey="ruleId" type="category" tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {data.issues.map((_, index) => (
                  <Cell fill={issueColors[index % issueColors.length]} key={index} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section className="tables-grid">
        <DataPanel title="Inventory Risk" action="Warehouse watch list">
          <div className="table">
            {data.inventoryRisk.slice(0, 7).map((item) => (
              <div className="table-row" key={`${item.warehouseId}-${item.canonicalSku}`}>
                <span>{item.canonicalSku}</span>
                <span>{item.warehouseId}</span>
                <strong className={item.riskLevel === "critical" ? "risk critical" : "risk"}>{item.availableQty}</strong>
              </div>
            ))}
          </div>
        </DataPanel>

        <DataPanel title="Recent Error Records" action="Latest rejects">
          <div className="table">
            {data.errors.slice(0, 7).map((item) => (
              <div className="table-row error-row" key={`${item.ruleId}-${item.businessKey}-${item.fieldName}`}>
                <span>{item.ruleId}</span>
                <span>{item.sourceTable}</span>
                <strong>{item.severity}</strong>
              </div>
            ))}
          </div>
        </DataPanel>

        <DataPanel title="Validated Orders" action="Clean sample">
          <div className="table">
            {data.orders.slice(0, 7).map((item) => (
              <div className="table-row" key={item.orderLineId}>
                <span>{item.orderId}</span>
                <span>{item.canonicalSku}</span>
                <strong>${Number(item.revenue).toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </DataPanel>
      </section>
    </>
  );
}

function PipelineRunsView({ data }: { data: DashboardData }) {
  return (
    <>
      <section className="journey-banner">
        <div>
          <span className="featured-pill">Latest run</span>
          <h2>{data.summary.latestRun.runId || "Pipeline run"}</h2>
          <p>
            The run processed {data.summary.latestRun.totalRecords.toLocaleString()} raw records, accepted{" "}
            {data.summary.cleanRecords.toLocaleString()}, rejected {data.summary.rejectedRecords.toLocaleString()}, and logged{" "}
            {data.summary.issueCount.toLocaleString()} data quality issues.
          </p>
        </div>
        <div className="run-score">
          <strong>{data.summary.dataQualityScore}%</strong>
          <span>quality score</span>
        </div>
      </section>

      <section className="story-grid">
        {pipelineSteps.map((step) => {
          const Icon = step.icon;
          return (
            <article className="story-card" key={step.title}>
              <Icon size={24} />
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          );
        })}
      </section>

      <section className="story-split">
        <DataPanel title="Rejected Record Trail" action="Why records were held back">
          <div className="table">
            {data.errors.slice(0, 8).map((item) => (
              <div className="table-row issue-detail-row" key={`${item.ruleId}-${item.businessKey}-${item.issue}`}>
                <span>{item.ruleId}</span>
                <span>{item.issue}</span>
                <strong>{item.sourceTable}</strong>
              </div>
            ))}
          </div>
        </DataPanel>
        <DataPanel title="Clean Data Loaded" action="Published canonical rows">
          <div className="metric-stack">
            <StoryMetric label="Clean records" value={data.summary.cleanRecords.toLocaleString()} />
            <StoryMetric label="Validated orders" value={data.summary.orders.toLocaleString()} />
            <StoryMetric label="Trusted revenue" value={`$${data.summary.totalRevenue.toLocaleString()}`} />
          </div>
        </DataPanel>
      </section>
    </>
  );
}

function RevenueQualityView({ data }: { data: DashboardData }) {
  const revenueIssues = data.issues.filter((issue) => ["DQ001", "DQ002", "DQ003", "DQ004", "DQ005", "DQ008"].includes(issue.ruleId));
  return (
    <>
      <section className="story-split wide-first">
        <ChartPanel title="Trusted Revenue Trend" subtitle="Only clean canonical order lines are included">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.revenue}>
              <defs>
                <linearGradient id="trustedRevenue" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbe6fb" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Trusted revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fill="url(#trustedRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
        <DataPanel title="Revenue Gate Checks" action="Before revenue is trusted">
          <div className="check-list">
            <CheckItem text="Order line has required IDs, customer, date, quantity, price, and currency." />
            <CheckItem text="SKU maps to the canonical SKU master from the warehouse workbook." />
            <CheckItem text="Quantity and unit price are positive; discount stays between 0 and 100." />
            <CheckItem text="Duplicate order-line keys are rejected before loading fact_order_line." />
          </div>
        </DataPanel>
      </section>

      <section className="tables-grid">
        <DataPanel title="Revenue DQ Issues" action="Rules blocking bad revenue">
          <div className="table">
            {revenueIssues.slice(0, 7).map((item) => (
              <div className="table-row" key={`${item.ruleId}-${item.issue}`}>
                <span>{item.ruleId}</span>
                <span>{item.issue}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </DataPanel>
        <DataPanel title="Clean Order Sample" action="Loaded to fact_order_line">
          <div className="table">
            {data.orders.slice(0, 7).map((item) => (
              <div className="table-row" key={item.orderLineId}>
                <span>{item.orderId}</span>
                <span>{item.canonicalSku}</span>
                <strong>${Number(item.revenue).toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </DataPanel>
        <DataPanel title="Revenue Result" action="Business-ready output">
          <div className="metric-stack">
            <StoryMetric label="Trusted revenue" value={`$${data.summary.totalRevenue.toLocaleString()}`} />
            <StoryMetric label="Validated orders" value={data.summary.orders.toLocaleString()} />
            <StoryMetric label="Rejected records" value={data.summary.rejectedRecords.toLocaleString()} />
          </div>
        </DataPanel>
      </section>
    </>
  );
}

function InventoryRiskView({ data }: { data: DashboardData }) {
  return (
    <section className="story-split wide-first">
      <DataPanel title="Inventory Risk Register" action="After SKU and availability validation">
        <div className="table">
          {data.inventoryRisk.map((item) => (
            <div className="table-row inventory-row" key={`${item.warehouseId}-${item.canonicalSku}`}>
              <span>{item.canonicalSku}</span>
              <span>
                {item.warehouseId} · reorder at {item.reorderPoint}
              </span>
              <strong className={item.riskLevel === "critical" ? "risk critical" : "risk"}>{item.availableQty}</strong>
            </div>
          ))}
        </div>
      </DataPanel>
      <DataPanel title="Inventory Transformation Story" action="Workbook to risk view">
        <div className="check-list">
          <CheckItem text="Read inventory_snapshot and SKU master from the Excel workbook." />
          <CheckItem text="Normalize every source SKU into the canonical SKU used by order lines." />
          <CheckItem text="Validate available quantity equals on-hand minus reserved quantity." />
          <CheckItem text="Flag SKU and warehouse combinations below reorder point for operational review." />
        </div>
      </DataPanel>
    </section>
  );
}

function ShipmentChecksView({ data }: { data: DashboardData }) {
  const shipmentErrors = data.errors.filter((item) => item.sourceTable === "shipments");
  const visibleErrors = shipmentErrors.length ? shipmentErrors : data.errors.filter((item) => ["DQ007", "DQ009"].includes(item.ruleId));
  return (
    <section className="story-split wide-first">
      <DataPanel title="Shipment Exceptions" action="Courier feed validation">
        <div className="table">
          {visibleErrors.slice(0, 10).map((item) => (
            <div className="table-row issue-detail-row" key={`${item.ruleId}-${item.businessKey}-${item.fieldName}`}>
              <span>{item.ruleId}</span>
              <span>{item.issue}</span>
              <strong>{item.businessKey}</strong>
            </div>
          ))}
        </div>
      </DataPanel>
      <DataPanel title="Fulfillment Checks" action="What the app proves">
        <div className="check-list">
          <CheckItem text="Delivered date cannot be earlier than shipped date." />
          <CheckItem text="Delivered shipments must include a tracking number." />
          <CheckItem text="Cancelled orders should not have delivered shipment events." />
          <CheckItem text="Shipment records are loaded only after passing timeline and status checks." />
        </div>
      </DataPanel>
    </section>
  );
}

function SourceFilesView({ data }: { data: DashboardData }) {
  return (
    <>
      <section className="source-grid">
        {sourceFiles.map((source) => {
          const Icon = source.icon;
          return (
            <article className="source-file-card" key={source.file}>
              <Icon size={26} />
              <div>
                <span>{source.file}</span>
                <h3>{source.name}</h3>
                <p>{source.role}</p>
              </div>
              <small>{source.issues}</small>
            </article>
          );
        })}
      </section>

      <section className="journey-banner compact">
        <div>
          <span className="featured-pill">Before → After</span>
          <h2>Raw operational exports became canonical analytics tables</h2>
          <p>
            The app turns fragmented inputs into `dim_customer`, `dim_product`, `dim_warehouse`, `fact_order_line`,
            `fact_return`, `fact_shipment`, `fact_inventory_snapshot`, and `dq_issue_log`.
          </p>
        </div>
        <ArrowRight size={42} />
        <div className="run-score">
          <strong>{data.summary.cleanRecords.toLocaleString()}</strong>
          <span>clean rows loaded</span>
        </div>
      </section>
    </>
  );
}

function QualityDial({ score }: { score: number }) {
  const angle = Math.min(360, Math.max(0, score * 3.6));
  return (
    <div className="quality-dial" style={{ background: `conic-gradient(#18c6a8 ${angle}deg, #e5eefc 0deg)` }}>
      <div>
        <strong>{score}%</strong>
        <span>DQ score</span>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, trend }: { icon: typeof Gauge; label: string; value: string; trend: string }) {
  return (
    <article className="kpi-card">
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{trend}</small>
    </article>
  );
}

function ChartPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <article className="panel chart-panel">
      <div className="panel-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </article>
  );
}

function DataPanel({ title, action, children }: { title: string; action: string; children: ReactNode }) {
  return (
    <article className="panel data-panel">
      <div className="panel-heading">
        <h3>{title}</h3>
        <span>{action}</span>
      </div>
      {children}
    </article>
  );
}

function StoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="story-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <div className="check-item">
      <CheckCircle2 size={18} />
      <span>{text}</span>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default App;
