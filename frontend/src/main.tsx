import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertCircle,
  ArrowDownToLine,
  BarChart3,
  Braces,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileSearch,
  FileText,
  Gift,
  HelpCircle,
  History,
  Home,
  Link2,
  LayoutTemplate,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  Wand2
} from "lucide-react";
import beeAvatarUrl from "../../agents/bee/avatar.png";
import calcAvatarUrl from "../../agents/calc/avatar.png";
import exAvatarUrl from "../../agents/ex/avatar.png";
import veeAvatarUrl from "../../agents/vee/avatar.png";
import vexAvatarUrl from "../../agents/vex/avatar.png";
import "./styles.css";

const API_BASE = "http://127.0.0.1:8000";
const APP_BASE = import.meta.env.BASE_URL === "/" ? "" : import.meta.env.BASE_URL.replace(/\/$/, "");
const DATAFLOW_TOWER_URL = APP_BASE ? "/" : "http://127.0.0.1:5174/";

type BrandConfig = {
  brandName?: string;
  appTitle?: string;
  primaryColor?: string;
  accentColor?: string;
  logoPath?: string;
  exportFilePrefix?: string;
};

type ModuleInfo = {
  id?: string;
  slug?: string;
  name?: string;
  title?: string;
  description?: string;
  status?: string;
};

type Mapping = Record<string, string>;

type PreviewResponse = {
  uploadId: string;
  columns: string[];
  rows: Record<string, unknown>[];
  mappings: Mapping;
};

type ProcessResponse = {
  cleanRows: Record<string, unknown>[];
  issues: Record<string, unknown>[];
  exportFilename: string;
};

type ComparisonPair = {
  left: string;
  right: string;
};

type ReconciliationPreviewResponse = {
  uploadAId: string;
  uploadBId: string;
  columnsA: string[];
  columnsB: string[];
  rowsA: Record<string, unknown>[];
  rowsB: Record<string, unknown>[];
  suggested: {
    keyA: string;
    keyB: string;
    comparisons: ComparisonPair[];
  };
};

type ReconciliationProcessResponse = {
  summary: Record<string, number>;
  matches: Record<string, unknown>[];
  exceptions: Record<string, unknown>[];
  exportFilename: string;
};

type ActivePage =
  | "dashboard"
  | "data-transformation"
  | "reconciliation"
  | "template-builder"
  | "document-extraction"
  | "lead-cleaner";

const agentCrew = [
  {
    id: "vex",
    name: "Vex",
    role: "Main Coordinator",
    avatar: vexAvatarUrl,
    spark: "M2 18 C8 17 9 9 14 13 S20 20 25 10 S31 14 36 7 S42 18 48 12"
  },
  {
    id: "bee",
    name: "Bee",
    role: "Research",
    avatar: beeAvatarUrl,
    spark: "M2 17 C7 12 10 16 14 14 S20 8 24 15 S30 19 34 8 S41 13 48 10"
  },
  {
    id: "ex",
    name: "Ex",
    role: "Execution",
    avatar: exAvatarUrl,
    spark: "M2 18 C9 14 11 20 17 16 S24 9 30 15 S38 13 48 11"
  },
  {
    id: "vee",
    name: "Vee",
    role: "Audit",
    avatar: veeAvatarUrl,
    spark: "M2 19 C8 12 12 14 17 15 S23 18 28 10 S35 13 39 7 S43 18 48 12"
  },
  {
    id: "calc",
    name: "Calc",
    role: "Scoring",
    avatar: calcAvatarUrl,
    spark: "M2 16 C8 15 12 13 16 14 S23 18 29 9 S34 19 39 12 S44 16 48 10"
  }
];

const fallbackModules: ModuleInfo[] = [
  {
    slug: "data-transformation",
    name: "Data Flow",
    description: "Preview, map, clean, and export uploaded tabular data.",
    status: "ready"
  },
  {
    slug: "reconciliation",
    name: "Reconciliation Flow",
    description: "Match records across ledgers, statements, and source systems.",
    status: "placeholder"
  },
  {
    slug: "template-builder",
    name: "Template Flow",
    description: "Create reusable client templates for repeatable data workflows.",
    status: "placeholder"
  },
  {
    slug: "document-extraction",
    name: "Document Extraction Flow",
    description: "Extract structured fields from invoices, forms, and documents.",
    status: "placeholder"
  },
  {
    slug: "lead-cleaner",
    name: "Lead Flow",
    description: "Normalize, dedupe, and enrich prospect lists before activation.",
    status: "placeholder"
  }
];

const targetFields = [
  "Customer ID",
  "First Name",
  "Last Name",
  "Email",
  "Phone",
  "Company",
  "Signup Date",
  "Status"
];

const moduleMeta: Record<string, { icon: React.ComponentType<{ size?: number }>; accent: string }> = {
  "data-transformation": { icon: Wand2, accent: "#17d6d2" },
  reconciliation: { icon: ClipboardList, accent: "#2667ff" },
  "template-builder": { icon: LayoutTemplate, accent: "#8b3dff" },
  "document-extraction": { icon: FileSearch, accent: "#ff7a21" },
  "lead-cleaner": { icon: Sparkles, accent: "#ff2f87" }
};

const runStats: Record<Exclude<ActivePage, "dashboard">, { count: string; tag: string; tone: string }> = {
  "data-transformation": { count: "248", tag: "Functional", tone: "mint" },
  reconciliation: { count: "96", tag: "Functional", tone: "blue" },
  "template-builder": { count: "74", tag: "Template", tone: "purple" },
  "document-extraction": { count: "112", tag: "AI-Powered", tone: "orange" },
  "lead-cleaner": { count: "113", tag: "Growth", tone: "pink" }
};

function normalizeSlug(module: ModuleInfo): ActivePage {
  const slug = (module.slug || module.id || module.name || "").toLowerCase().replace(/\s+/g, "-");
  if (slug.includes("transform")) return "data-transformation";
  if (slug.includes("recon")) return "reconciliation";
  if (slug.includes("template")) return "template-builder";
  if (slug.includes("document") || slug.includes("extract")) return "document-extraction";
  if (slug.includes("lead")) return "lead-cleaner";
  return "dashboard";
}

function stripAppBase(pathname: string): string {
  if (APP_BASE && pathname.startsWith(APP_BASE)) {
    return pathname.slice(APP_BASE.length) || "/";
  }
  return pathname;
}

function pageFromPath(pathname: string): ActivePage {
  const path = stripAppBase(pathname);
  if (path.includes("/modules/data-transform")) return "data-transformation";
  if (path.includes("/modules/reconciliation")) return "reconciliation";
  if (path.includes("/modules/template-builder")) return "template-builder";
  if (path.includes("/modules/document-extraction")) return "document-extraction";
  if (path.includes("/modules/lead-cleaner")) return "lead-cleaner";
  return "dashboard";
}

function routeForPage(page: ActivePage): string {
  const routes: Record<ActivePage, string> = {
    dashboard: "/",
    "data-transformation": "/modules/data-transform",
    reconciliation: "/modules/reconciliation",
    "template-builder": "/modules/template-builder",
    "document-extraction": "/modules/document-extraction",
    "lead-cleaner": "/modules/lead-cleaner"
  };
  const route = routes[page];
  return APP_BASE ? `${APP_BASE}${route === "/" ? "/" : route}` : route;
}

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

function App() {
  const [brand, setBrand] = useState<BrandConfig>({});
  const [modules, setModules] = useState<ModuleInfo[]>(fallbackModules);
  const [activePage, setActivePage] = useState<ActivePage>(() => pageFromPath(window.location.pathname));
  const [loadingShell, setLoadingShell] = useState(true);
  const [shellError, setShellError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadShell() {
      setLoadingShell(true);
      setShellError(null);
      try {
        const [brandResponse, modulesResponse] = await Promise.all([
          readJson<BrandConfig>("/api/brand"),
          readJson<ModuleInfo[]>("/api/modules")
        ]);
        if (!mounted) return;
        setBrand(brandResponse);
        setModules(modulesResponse.length ? modulesResponse : fallbackModules);
      } catch (error) {
        if (!mounted) return;
        setShellError(error instanceof Error ? error.message : "Unable to load shell configuration.");
        setModules(fallbackModules);
      } finally {
        if (mounted) setLoadingShell(false);
      }
    }
    loadShell();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function handlePopState() {
      setActivePage(pageFromPath(window.location.pathname));
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(page: ActivePage) {
    const route = routeForPage(page);
    if (window.location.pathname !== route) {
      window.history.pushState({}, "", route);
    }
    setActivePage(page);
    setActionNotice(null);
  }

  function handleAction(message: string) {
    setActionNotice(message);
    if (activePage !== "dashboard") {
      navigate("dashboard");
      setActionNotice(message);
    }
  }

  const brandName = brand.brandName || "Luma Flow";
  const primaryColor = brand.primaryColor || "#07153A";
  const accentColor = brand.accentColor || "#00E5FF";

  const moduleCards = useMemo(
    () =>
      fallbackModules.map((fallback) => {
        const match = modules.find((item) => normalizeSlug(item) === normalizeSlug(fallback));
        return { ...fallback, ...match };
      }),
    [modules]
  );

  return (
    <div className="app-shell" style={{ "--brand": primaryColor, "--accent": accentColor } as React.CSSProperties}>
      <aside className="sidebar">
        <button className="brand-lockup" onClick={() => navigate("dashboard")}>
          {brand.logoPath ? <img src={brand.logoPath} alt="" /> : <span className="luma-mark" aria-hidden="true" />}
          <span>
            <strong>{brandName}</strong>
            <small>Agentic platform</small>
          </span>
        </button>

        <nav className="nav-list primary-nav" aria-label="Suite modules">
          <NavButton active={activePage === "dashboard"} icon={Home} label="Workspace" onClick={() => navigate("dashboard")} />
          {moduleCards.map((module) => {
            const page = normalizeSlug(module);
            const Icon = moduleMeta[page]?.icon || Braces;
            if (page === "data-transformation") {
              return (
                <a className="nav-button app-switch-link" href={DATAFLOW_TOWER_URL} key={page}>
                  <Icon size={18} />
                  <span>{module.name || module.title || "Data Flow"}</span>
                </a>
              );
            }
            return (
              <NavButton
                key={page}
                active={activePage === page}
                icon={Icon}
                label={module.name || module.title || page}
                onClick={() => navigate(page)}
              />
            );
          })}
        </nav>

        <nav className="nav-list utility-nav" aria-label="Workspace utilities">
          <NavButton active={false} icon={History} label="Runs & History" onClick={() => handleAction("Runs & History is ready as a dashboard view. Showing the latest run activity.")} />
          <NavButton active={false} icon={Link2} label="Connections" onClick={() => handleAction("Connections will manage API keys, storage, and client system links. Backend connection slots are next.")} />
          <NavButton active={false} icon={LayoutTemplate} label="Templates" onClick={() => navigate("template-builder")} />
          <NavButton active={false} icon={Settings} label="Settings" onClick={() => handleAction("Settings are driven by brand.config.json for now: brand, colors, logo path, and export prefix.")} />
          <a className="nav-button app-switch-link" href={DATAFLOW_TOWER_URL}>
            <BarChart3 size={18} />
            <span>DataFlow Tower</span>
          </a>
        </nav>

        <div className="sidebar-badge">
          <ShieldCheck size={34} />
          <span>
            <strong>Client Ready</strong>
            <small>Configurable. Secure. Demo-ready.</small>
          </span>
        </div>
      </aside>

      <main className="workspace">
        <TopNav onAction={handleAction} />

        {shellError && (
          <div className="notice" role="status">
            <AlertCircle size={18} />
            <span>Using local demo defaults until the API responds: {shellError}</span>
          </div>
        )}

        {actionNotice && (
          <div className="notice action-notice" role="status">
            <CheckCircle2 size={18} />
            <span>{actionNotice}</span>
          </div>
        )}

        {activePage === "dashboard" && <Dashboard modules={moduleCards} onOpen={navigate} onAction={handleAction} shellError={shellError} loadingShell={loadingShell} brand={brand} />}
        {activePage !== "dashboard" && (
          <>
            <header className="page-header compact">
              <div>
                <p className="eyebrow">{loadingShell ? "Loading configuration" : brand.appTitle || "Luma Flow"}</p>
                <h1>{pageTitle(activePage)}</h1>
                <p className="page-subtitle">{pageSubtitle(activePage)}</p>
              </div>
              <StatusPill label={shellError ? "Fallback config" : "Flow engine connected"} tone={shellError ? "warning" : "success"} />
            </header>
            {activePage === "data-transformation" && <DataTransformationPortal />}
            {activePage === "reconciliation" && <ReconciliationPortal />}
            {activePage === "template-builder" && <PlaceholderPage moduleId="template-builder" icon={LayoutTemplate} />}
            {activePage === "document-extraction" && <PlaceholderPage moduleId="document-extraction" icon={FileSearch} />}
            {activePage === "lead-cleaner" && <PlaceholderPage moduleId="lead-cleaner" icon={Sparkles} />}
          </>
        )}
      </main>
    </div>
  );
}

function TopNav({ onAction }: { onAction: (message: string) => void }) {
  return (
    <header className="app-topbar">
      <label className="global-search">
        <Search size={18} />
        <input aria-label="Search flows, templates, docs" placeholder="Search flows, templates, docs..." />
        <kbd>⌘ K</kbd>
      </label>
      <div className="topbar-actions">
        <button aria-label="Rewards"><Gift size={18} /></button>
        <button className="has-dot" aria-label="Notifications"><Bell size={18} /></button>
        <button aria-label="Help"><HelpCircle size={18} /></button>
        <button className="profile-button" aria-label="User menu">
          <span><UserRound size={18} /></span>
          <i />
          <ChevronRight size={16} />
        </button>
      </div>
    </header>
  );
}

function NavButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "success" | "warning" | "neutral" }) {
  return <span className={`status-pill ${tone}`}>{label}</span>;
}

function Dashboard({
  modules,
  onOpen,
  onAction,
  shellError,
  loadingShell,
  brand
}: {
  modules: ModuleInfo[];
  onOpen: (page: ActivePage) => void;
  onAction: (message: string) => void;
  shellError: string | null;
  loadingShell: boolean;
  brand: BrandConfig;
}) {
  return (
    <div className="workspace-dashboard">
      <section className="workspace-heading">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Welcome back, Alex <span aria-hidden="true">👋</span></h1>
          <p className="page-subtitle">Build, run, and manage reusable automation flows across your organization.</p>
        </div>
        <div className="heading-actions">
          <StatusPill label={shellError ? "Fallback config" : "Flow engine connected"} tone={shellError ? "warning" : "success"} />
          <button className="new-flow-button" onClick={() => onAction("New Flow is ready to route new automations. Pick a flow card below to start from a working template.")}>
            <Plus size={18} />
            New Flow
            <ChevronRight size={16} />
          </button>
        </div>
      </section>

      <nav className="workspace-tabs" aria-label="Workspace views">
        {["Overview", "My Flows", "Shared", "Favorites", "Recent Runs"].map((tab, index) => (
          <button
            className={index === 0 ? "active" : ""}
            key={tab}
            onClick={() => onAction(`${tab} view selected. The dashboard cards below are the active workspace surface for now.`)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <section className="workspace-main-grid">
        <FeaturedFlow onOpen={() => onOpen("data-transformation")} />
        <div className="insights-stack">
          <RecentRuns onAction={onAction} />
          <SystemHealth />
        </div>
      </section>

      <FlowCards modules={modules} onOpen={onOpen} />
      <AgentCrew onAction={onAction} />
    </div>
  );
}

function FeaturedFlow({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="featured-flow">
      <div className="featured-copy">
        <span className="featured-label">Featured</span>
        <h2>Data Flow</h2>
        <p>Clean, map, validate, and export messy customer data with confidence.</p>
        <button onClick={onOpen}>
          Open Data Flow
          <ChevronRight size={18} />
        </button>
      </div>
      <FlowGraphic />
      <div className="featured-stats">
        <span><strong>248</strong><small>Runs this month</small></span>
        <span><strong>99.2%</strong><small>Success rate</small></span>
        <span><strong>1.2M</strong><small>Records processed</small></span>
        <span><strong>18m</strong><small>Avg. runtime</small></span>
      </div>
    </section>
  );
}

function FlowGraphic() {
  return (
    <div className="flow-graphic" aria-hidden="true">
      <svg viewBox="0 0 360 250" role="img">
        <defs>
          <linearGradient id="lineGlow" x1="0" x2="1">
            <stop offset="0%" stopColor="#2df5ff" />
            <stop offset="100%" stopColor="#8b3dff" />
          </linearGradient>
        </defs>
        <path d="M160 65 H220 Q245 65 245 90 V120 Q245 144 270 144 H306" />
        <path d="M160 176 H218 Q244 176 244 150 V128" />
        <path d="M242 128 H190 Q166 128 166 152 V176" />
        <circle cx="220" cy="65" r="5" />
        <circle cx="245" cy="120" r="5" />
        <circle cx="190" cy="128" r="5" />
      </svg>
      <span className="flow-node node-one"><Wand2 size={26} /></span>
      <span className="flow-node node-two"><FileText size={26} /></span>
      <span className="flow-node node-three"><Sparkles size={28} /></span>
      <span className="flow-node node-four"><ClipboardList size={26} /></span>
      <span className="flow-check"><CheckCircle2 size={34} /></span>
    </div>
  );
}

function RecentRuns({ onAction }: { onAction: (message: string) => void }) {
  const runs = [
    ["Data Flow", "2 min ago", "Success", "success"],
    ["Reconciliation Flow", "15 min ago", "Success", "success"],
    ["Document Extraction Flow", "42 min ago", "Warning", "warning"],
    ["Lead Flow", "1 hr ago", "Success", "success"]
  ];
  return (
    <section className="side-card recent-runs">
      <header>
        <h2>Recent Runs</h2>
        <button onClick={() => onAction("Showing recent run activity. Full run history will become its own filterable workspace view.")}>View all</button>
      </header>
      {runs.map(([name, time, status, tone]) => (
        <div className="run-row" key={name}>
          <span className={`run-dot ${tone}`} />
          <strong>{name}</strong>
          <small>{time}</small>
          <em className={tone}>{status}</em>
        </div>
      ))}
    </section>
  );
}

function SystemHealth() {
  return (
    <section className="side-card system-health">
      <span className="health-icon"><ShieldCheck size={36} /></span>
      <div>
        <h2>System Health</h2>
        <p>All systems operational</p>
        <div className="health-checks">
          {["Flow Engine", "Workers", "Integrations", "Storage"].map((item) => (
            <span key={item}><CheckCircle2 size={14} />{item}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function FlowCards({ modules, onOpen }: { modules: ModuleInfo[]; onOpen: (page: ActivePage) => void }) {
  return (
    <section className="flow-card-grid">
      {modules.map((module) => {
        const page = normalizeSlug(module);
        const meta = moduleMeta[page] || moduleMeta["data-transformation"];
        const Icon = meta.icon;
        const stats = runStats[page as Exclude<ActivePage, "dashboard">];
        return (
          <button className="flow-card" key={page} onClick={() => onOpen(page)} style={{ "--module-accent": meta.accent } as React.CSSProperties}>
            <span className="module-icon">
              <Icon size={22} />
            </span>
            <span className={`mini-tag ${stats.tone}`}>{stats.tag}</span>
            <strong>{module.name || module.title}</strong>
            <small>{module.description}</small>
            <span className="flow-card-footer">
              <span>{stats.count} runs this month</span>
              <ChevronRight size={18} />
            </span>
          </button>
        );
      })}
    </section>
  );
}

function AgentCrew({ onAction }: { onAction: (message: string) => void }) {
  return (
    <section className="agent-crew" aria-label="Luma Flow agent crew">
      <div className="agent-crew-heading">
        <div>
          <p className="eyebrow">Agent Crew</p>
          <h2>Your workflow operators</h2>
          <small>Specialized AI agents that power and operate your flows.</small>
        </div>
        <button onClick={() => onAction("Agent crew management is ready for role, model, and workflow assignment settings.")}>Manage crew <ChevronRight size={16} /></button>
      </div>
      <div className="agent-strip">
        {agentCrew.map((agent) => (
          <article className="agent-tile" key={agent.id}>
            <span className="agent-avatar">
              <img src={agent.avatar} alt={`${agent.name} avatar`} />
            </span>
            <span>
              <strong>{agent.name}</strong>
              <small>{agent.role}</small>
              <em><i /> Online</em>
            </span>
            <svg className="sparkline" viewBox="0 0 50 24" aria-hidden="true">
              <path d={agent.spark} />
            </svg>
          </article>
        ))}
        <button className="add-agent-card" onClick={() => onAction("Add agent will create a new workflow operator profile once agent configuration is enabled.")}>
          <Plus size={26} />
          <span>Add agent</span>
        </button>
      </div>
    </section>
  );
}

function DataTransformationPortal() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [mappings, setMappings] = useState<Mapping>({});
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [busy, setBusy] = useState<"preview" | "process" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] || null);
    setPreview(null);
    setMappings({});
    setResult(null);
    setError(null);
  }

  async function handlePreview(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a CSV or workbook file before requesting a preview.");
      return;
    }
    setBusy("preview");
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await readJson<PreviewResponse>("/api/transform/preview", {
        method: "POST",
        body: formData
      });
      setPreview(response);
      setMappings(response.mappings);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Preview failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleProcess() {
    if (!preview) return;
    setBusy("process");
    setError(null);
    try {
      const response = await readJson<ProcessResponse>("/api/transform/process", {
        method: "POST",
        body: buildProcessForm(preview.uploadId, mappings)
      });
      setResult(response);
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : "Processing failed.");
    } finally {
      setBusy(null);
    }
  }

  const tableRows = result?.cleanRows || preview?.rows || [];
  const columns = result?.cleanRows?.[0] ? Object.keys(result.cleanRows[0]) : preview?.columns || [];

  return (
    <section className="portal-layout">
      <div className="tool-panel">
        <form className="upload-zone" onSubmit={handlePreview}>
          <Upload size={28} />
          <div>
            <h2>Launch Data Flow</h2>
            <p>Preview columns, tune field mappings, then generate a clean business-ready export.</p>
          </div>
          <label className="file-input">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
            <span>{file ? file.name : "Select file"}</span>
          </label>
          <button className="primary-action" disabled={busy !== null} type="submit">
            {busy === "preview" ? <Loader2 className="spin" size={18} /> : <RefreshCcw size={18} />}
            Preview
          </button>
        </form>

        {preview && (
          <div className="mapping-panel">
            <div className="panel-heading">
              <h2>Detected Mappings</h2>
              <StatusPill label={`${preview.columns.length} columns`} tone="neutral" />
            </div>
            <div className="mapping-list">
              {Object.entries(preview.mappings).length ? (
                targetFields.map((target) => (
                  <div className="mapping-row" key={target}>
                    <select
                      aria-label={`Source column for ${target}`}
                      value={mappings[target] || ""}
                      onChange={(event) =>
                        setMappings((current) => ({ ...current, [target]: event.target.value }))
                      }
                    >
                      <option value="">Not mapped</option>
                      {preview.columns.map((column) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </select>
                    <ChevronRight size={16} />
                    <strong>{target}</strong>
                  </div>
                ))
              ) : (
                <p className="empty-state">No mappings returned yet.</p>
              )}
            </div>
            <button className="primary-action wide" disabled={busy !== null} onClick={handleProcess}>
              {busy === "process" ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
              Process Data
            </button>
          </div>
        )}

        {result && (
          <div className="result-panel">
            <div>
              <h2>Export Ready</h2>
              <p>{result.cleanRows.length} cleaned rows with {result.issues.length} issue notes.</p>
            </div>
            <a className="download-action" href={`${API_BASE}/api/exports/${encodeURIComponent(result.exportFilename)}`}>
              <ArrowDownToLine size={18} />
              Download
            </a>
          </div>
        )}
      </div>

      <div className="data-panel">
        {error && (
          <div className="notice error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        <div className="panel-heading">
          <h2>{result ? "Clean Data" : "Preview Data"}</h2>
          <StatusPill label={`${tableRows.length} rows`} tone="neutral" />
        </div>
        <DataTable columns={columns} rows={tableRows} />
        {result?.issues?.length ? (
          <div className="issues-list">
            <h3>Issues</h3>
            {result.issues.map((issue, index) => (
              <p key={`${issue.row}-${issue.field}-${index}`}>
                Row {String(issue.row ?? "")}: {String(issue.field ?? "Field")} - {String(issue.issue ?? "Review needed")}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function buildProcessForm(uploadId: string, mappings: Mapping): FormData {
  const formData = new FormData();
  formData.append("upload_id", uploadId);
  formData.append("mappings_json", JSON.stringify(mappings));
  return formData;
}

function DataTable({ columns, rows }: { columns: string[]; rows: Record<string, unknown>[] }) {
  if (!columns.length || !rows.length) {
    return (
      <div className="table-empty">
        <FileText size={30} />
        <p>Data preview will appear here after upload.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={column}>{String(row[column] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReconciliationPortal() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [preview, setPreview] = useState<ReconciliationPreviewResponse | null>(null);
  const [keyA, setKeyA] = useState("");
  const [keyB, setKeyB] = useState("");
  const [comparisons, setComparisons] = useState<ComparisonPair[]>([]);
  const [result, setResult] = useState<ReconciliationProcessResponse | null>(null);
  const [busy, setBusy] = useState<"preview" | "process" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetFlow() {
    setPreview(null);
    setKeyA("");
    setKeyB("");
    setComparisons([]);
    setResult(null);
    setError(null);
  }

  async function handlePreview(event: FormEvent) {
    event.preventDefault();
    if (!fileA || !fileB) {
      setError("Choose two CSV or workbook files before running reconciliation.");
      return;
    }
    setBusy("preview");
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file_a", fileA);
      formData.append("file_b", fileB);
      const response = await readJson<ReconciliationPreviewResponse>("/api/reconciliation/preview", {
        method: "POST",
        body: formData
      });
      setPreview(response);
      setKeyA(response.suggested.keyA);
      setKeyB(response.suggested.keyB);
      setComparisons(response.suggested.comparisons.length ? response.suggested.comparisons : [{ left: "", right: "" }]);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Reconciliation preview failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleProcess() {
    if (!preview) return;
    setBusy("process");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("upload_a_id", preview.uploadAId);
      formData.append("upload_b_id", preview.uploadBId);
      formData.append("key_a", keyA);
      formData.append("key_b", keyB);
      formData.append("comparisons_json", JSON.stringify(comparisons.filter((pair) => pair.left && pair.right)));
      const response = await readJson<ReconciliationProcessResponse>("/api/reconciliation/process", {
        method: "POST",
        body: formData
      });
      setResult(response);
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : "Reconciliation failed.");
    } finally {
      setBusy(null);
    }
  }

  const previewRows = preview?.rowsA || [];
  const previewColumns = preview?.columnsA || [];
  const resultRows = result?.exceptions?.length ? result.exceptions : result?.matches || [];
  const resultColumns = resultRows[0] ? Object.keys(resultRows[0]) : [];

  return (
    <section className="portal-layout">
      <div className="tool-panel">
        <form className="upload-zone" onSubmit={handlePreview}>
          <ClipboardList size={28} />
          <div>
            <h2>Launch Reconciliation Flow</h2>
            <p>Upload two business reports, choose matching keys, compare any fields, and export exceptions.</p>
          </div>
          <label className="file-input">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => {
                setFileA(event.target.files?.[0] || null);
                resetFlow();
              }}
            />
            <span>{fileA ? `Report A: ${fileA.name}` : "Select report A"}</span>
          </label>
          <label className="file-input">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => {
                setFileB(event.target.files?.[0] || null);
                resetFlow();
              }}
            />
            <span>{fileB ? `Report B: ${fileB.name}` : "Select report B"}</span>
          </label>
          <button className="primary-action" disabled={busy !== null} type="submit">
            {busy === "preview" ? <Loader2 className="spin" size={18} /> : <RefreshCcw size={18} />}
            Preview Match
          </button>
        </form>

        {preview && (
          <div className="mapping-panel">
            <div className="panel-heading">
              <h2>Match Setup</h2>
              <StatusPill label={`${preview.columnsA.length + preview.columnsB.length} columns`} tone="neutral" />
            </div>
            <div className="mapping-list">
              <div className="mapping-row">
                <select aria-label="Report A key column" value={keyA} onChange={(event) => setKeyA(event.target.value)}>
                  <option value="">Report A key</option>
                  {preview.columnsA.map((column) => (
                    <option key={column} value={column}>{column}</option>
                  ))}
                </select>
                <ChevronRight size={16} />
                <select aria-label="Report B key column" value={keyB} onChange={(event) => setKeyB(event.target.value)}>
                  <option value="">Report B key</option>
                  {preview.columnsB.map((column) => (
                    <option key={column} value={column}>{column}</option>
                  ))}
                </select>
              </div>
              {comparisons.map((pair, index) => (
                <div className="mapping-row" key={index}>
                  <select
                    aria-label={`Report A comparison ${index + 1}`}
                    value={pair.left}
                    onChange={(event) =>
                      setComparisons((current) =>
                        current.map((item, itemIndex) => itemIndex === index ? { ...item, left: event.target.value } : item)
                      )
                    }
                  >
                    <option value="">Compare field A</option>
                    {preview.columnsA.map((column) => (
                      <option key={column} value={column}>{column}</option>
                    ))}
                  </select>
                  <ChevronRight size={16} />
                  <select
                    aria-label={`Report B comparison ${index + 1}`}
                    value={pair.right}
                    onChange={(event) =>
                      setComparisons((current) =>
                        current.map((item, itemIndex) => itemIndex === index ? { ...item, right: event.target.value } : item)
                      )
                    }
                  >
                    <option value="">Compare field B</option>
                    {preview.columnsB.map((column) => (
                      <option key={column} value={column}>{column}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button className="ghost-action" type="button" onClick={() => setComparisons((current) => [...current, { left: "", right: "" }])}>
              <Plus size={16} />
              Add comparison
            </button>
            <button className="primary-action wide" disabled={busy !== null} onClick={handleProcess}>
              {busy === "process" ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
              Reconcile Reports
            </button>
          </div>
        )}

        {result && (
          <div className="result-panel">
            <div>
              <h2>Exception Report Ready</h2>
              <p>{result.summary.matched || 0} matched records and {result.summary.exceptions || 0} exceptions.</p>
            </div>
            <a className="download-action" href={`${API_BASE}/api/exports/${encodeURIComponent(result.exportFilename)}`}>
              <ArrowDownToLine size={18} />
              Download
            </a>
          </div>
        )}
      </div>

      <div className="data-panel">
        {error && (
          <div className="notice error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {result && (
          <div className="summary-grid">
            {Object.entries(result.summary).map(([label, value]) => (
              <div key={label}>
                <strong>{value}</strong>
                <small>{splitCamelCase(label)}</small>
              </div>
            ))}
          </div>
        )}
        <div className="panel-heading">
          <h2>{result ? "Exceptions" : "Report A Preview"}</h2>
          <StatusPill label={`${resultRows.length || previewRows.length} rows`} tone="neutral" />
        </div>
        <DataTable columns={result ? resultColumns : previewColumns} rows={result ? resultRows : previewRows} />
      </div>
    </section>
  );
}

function splitCamelCase(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

const placeholderDetails: Record<
  Exclude<ActivePage, "dashboard" | "data-transformation">,
  { title: string; input: string; workflow: string; output: string }
> = {
  reconciliation: {
    title: "Reconciliation Flow",
    input: "Two operational reports or exports",
    workflow: "Match IDs, totals, dates, and statuses, then separate clean matches from exceptions.",
    output: "Exception report with missing records and mismatched values"
  },
  "template-builder": {
    title: "Template Flow",
    input: "Source file and target upload template",
    workflow: "Confirm field mappings, fill required template columns, and validate missing values.",
    output: "Completed upload-ready workbook"
  },
  "document-extraction": {
    title: "Document Extraction Flow",
    input: "Invoices, forms, contracts, or PDF exports",
    workflow: "Extract key fields into a review table before approving structured output.",
    output: "Reviewed extraction table exported to Excel"
  },
  "lead-cleaner": {
    title: "Lead Flow",
    input: "Raw prospect, CRM, or spreadsheet lists",
    workflow: "Deduplicate records, standardize company fields, validate contacts, and score readiness.",
    output: "Clean prospecting list with issue notes"
  }
};

function PlaceholderPage({
  moduleId,
  icon: Icon
}: {
  moduleId: Exclude<ActivePage, "dashboard" | "data-transformation">;
  icon: React.ComponentType<{ size?: number }>;
}) {
  const detail = placeholderDetails[moduleId];
  return (
    <section className="placeholder-view">
      <Icon size={42} />
      <div>
        <h2>{detail.title}</h2>
        <p>{detail.workflow}</p>
        <dl className="placeholder-facts">
          <div>
            <dt>Input</dt>
            <dd>{detail.input}</dd>
          </div>
          <div>
            <dt>Output</dt>
            <dd>{detail.output}</dd>
          </div>
        </dl>
        <button className="primary-action" disabled>
          Demo Preview
        </button>
      </div>
    </section>
  );
}

function pageTitle(page: ActivePage) {
  const titles: Record<ActivePage, string> = {
    dashboard: "Solution Dashboard",
    "data-transformation": "Data Flow",
    reconciliation: "Reconciliation Flow",
    "template-builder": "Template Flow",
    "document-extraction": "Document Extraction Flow",
    "lead-cleaner": "Lead Flow"
  };
  return titles[page];
}

function pageSubtitle(page: ActivePage) {
  const subtitles: Record<ActivePage, string> = {
    dashboard: "Manage reusable automation flows for data, documents, and operations.",
    "data-transformation": "Clean, map, validate, and export messy business files.",
    reconciliation: "Compare reports, isolate exceptions, and package review-ready outputs.",
    "template-builder": "Turn source files into structured upload templates with repeatable mappings.",
    "document-extraction": "Convert documents into structured review tables and exports.",
    "lead-cleaner": "Prepare raw prospect lists for outreach with clean, scored data."
  };
  return subtitles[page];
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
