import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  DatabaseZap,
  FileJson,
  Gauge,
  PackageSearch,
  RefreshCw,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Truck,
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

const navItems = [
  { label: "Control Tower", icon: Gauge },
  { label: "Pipeline Runs", icon: DatabaseZap },
  { label: "Revenue Quality", icon: BarChart3 },
  { label: "Inventory Risk", icon: Boxes },
  { label: "Shipment Checks", icon: Truck },
  { label: "Source Files", icon: FileJson },
];

const issueColors = ["#2563eb", "#06b6d4", "#8b5cf6", "#f97316", "#ec4899", "#14b8a6"];

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const initialized = useRef(false);

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
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button className={index === 0 ? "nav-item active" : "nav-item"} key={item.label}>
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
            <span className="eyebrow">UrbanThread Outfitters</span>
            <h1>DataFlow Control Tower</h1>
            <p>Validate revenue, inventory, returns, fulfillment, and support signals from fragmented ecommerce systems.</p>
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
          <Dashboard data={data} />
        ) : null}
      </section>
    </main>
  );
}

function Dashboard({ data }: { data: DashboardData }) {
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default App;
