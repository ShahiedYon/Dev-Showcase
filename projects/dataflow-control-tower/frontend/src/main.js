import "./styles.css";
import { fieldMappings, qualityRules, sourceFiles } from "./data.js";
import { runDataPipeline } from "./pipeline.js";

const state = { result: null, running: false, ruleDomain: "all", exceptionSearch: "", exceptionSeverity: "all", mappingSearch: "" };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const formatNumber = new Intl.NumberFormat("en-ZA");
const formatMoney = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatTime = (date) => new Intl.DateTimeFormat("en-ZA", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char]);
const titleCase = (value) => String(value).replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

const showToast = (message) => {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 2600);
};

const activateView = (view, updateHash = true) => {
  if (!$("[data-view-panel='" + view + "']")) view = "overview";
  $$('[data-view-panel]').forEach((panel) => panel.classList.toggle("active", panel.dataset.viewPanel === view));
  $$('[data-view]').forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    if (button.matches(".nav-item")) active ? button.setAttribute("aria-current", "page") : button.removeAttribute("aria-current");
  });
  if (updateHash) history.replaceState(null, "", view === "overview" ? "#overview" : `#${view}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const makeStageMarkup = (stage, index, compact = false) => `
  <div class="${compact ? "stage-chip" : "pipeline-stage"}" data-stage-id="${escapeHtml(stage.id)}">
    <span class="stage-index">${String(index + 1).padStart(2, "0")}</span>
    <div><strong>${escapeHtml(stage.title)}</strong>${compact ? "" : `<p>${escapeHtml(stage.detail)}</p>`}</div>
    <span class="stage-status"><span></span>${stage.status === "complete" ? `${stage.duration} ms` : titleCase(stage.status)}</span>
  </div>`;

const renderOverview = (result) => {
  $("#hero-score").textContent = `${result.qualityScore}%`;
  $("#metric-raw").textContent = formatNumber.format(result.rawTotal);
  $("#metric-clean").textContent = formatNumber.format(result.acceptedTotal);
  $("#metric-rejected").textContent = formatNumber.format(result.rejectedTotal);
  $("#metric-issues").textContent = formatNumber.format(result.issueCount);
  $("#metric-revenue").textContent = formatMoney.format(result.trustedRevenue);
  $("#overview-stages").innerHTML = result.stages.map((stage, index) => makeStageMarkup(stage, index, true)).join("");

  const topRules = Object.entries(result.issues.reduce((acc, item) => ({ ...acc, [item.ruleId]: (acc[item.ruleId] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  $("#quality-brief").innerHTML = [
    `${result.acceptedTotal} of ${result.rawTotal} source records passed all applicable controls.`,
    `${result.rejectedTotal} records were isolated for remediation; no invalid rows entered canonical facts.`,
    topRules.length ? `Most frequent control: ${topRules[0][0]} with ${topRules[0][1]} issue${topRules[0][1] === 1 ? "" : "s"}.` : "No quality issues detected.",
    `${result.openSupportTickets} open support tickets add operational context without affecting trusted revenue.`,
  ].map((text) => `<li><span aria-hidden="true">↗</span><p>${escapeHtml(text)}</p></li>`).join("");

  $("#source-mini-list").innerHTML = sourceFiles.map((source) => `
    <div class="source-mini"><span class="file-type ${source.type.toLowerCase()}">${escapeHtml(source.type)}</span><div><strong>${escapeHtml(source.name)}</strong><small>${escapeHtml(source.detail)}</small></div></div>
  `).join("");

  const chartDomains = ["orders", "inventory", "returns", "shipments"];
  const maxIssues = Math.max(1, ...chartDomains.map((domain) => result.issuesByDomain[domain] || 0));
  $("#domain-chart").innerHTML = chartDomains.map((domain) => {
    const count = result.issuesByDomain[domain] || 0;
    return `<div class="bar-row"><span>${titleCase(domain)}</span><div><i style="width:${(count / maxIssues) * 100}%"></i></div><strong>${count}</strong></div>`;
  }).join("");

  $("#overview-reconciliation").innerHTML = result.reconciliations.map((row) => `
    <div><span>${titleCase(row.source)}</span><strong>${row.raw} = ${row.accepted} + ${row.rejected}</strong><em>Balanced</em></div>
  `).join("");
};

const renderPipeline = (result) => {
  $("#run-id").textContent = result.runId;
  $("#sqlite-size").textContent = `${Math.max(1, Math.round(result.databaseBytes.byteLength / 1024))} KB`;
  $("#run-duration").textContent = `${result.duration} ms`;
  $("#pipeline-stages").innerHTML = result.stages.map((stage, index) => makeStageMarkup(stage, index)).join("");
  $("#source-disposition").innerHTML = sourceFiles.map((source) => {
    const raw = result.rawCounts[source.key];
    const accepted = result.acceptedBySource[source.key];
    const rejected = result.rejectedBySource[source.key];
    const percentage = raw ? (accepted / raw) * 100 : 0;
    return `<div class="disposition-row"><div><strong>${escapeHtml(source.domain)}</strong><span>${raw} source records</span></div><div class="disposition-track"><i style="width:${percentage}%"></i></div><div><strong>${accepted}</strong><span>accepted</span></div><div class="reject-count"><strong>${rejected}</strong><span>rejected</span></div></div>`;
  }).join("");
  $("#canonical-grid").innerHTML = Object.entries(result.tableCounts).map(([table, count]) => `<div><span>${escapeHtml(table)}</span><strong>${count}</strong><small>rows loaded</small></div>`).join("");
};

const renderMapping = () => {
  const needle = state.mappingSearch.toLowerCase();
  const rows = fieldMappings.filter((item) => Object.values(item).join(" ").toLowerCase().includes(needle));
  $("#mapped-field-count").textContent = fieldMappings.length;
  $("#mapping-table").innerHTML = rows.map((row) => `<tr><td><span class="source-badge">${escapeHtml(row.source)}</span></td><td><code>${escapeHtml(row.field)}</code></td><td>${escapeHtml(row.transformation)}</td><td><code class="target-code">${escapeHtml(row.target)}</code></td><td><span class="rule-id">${escapeHtml(row.control)}</span></td></tr>`).join("");
};

const renderRules = () => {
  const rows = qualityRules.filter((rule) => state.ruleDomain === "all" || rule.domain === state.ruleDomain);
  $("#rules-table").innerHTML = rows.map((rule) => `<tr><td><span class="rule-id">${rule.id}</span></td><td>${titleCase(rule.domain)}</td><td>${escapeHtml(rule.rule)}</td><td><span class="severity ${rule.severity}">${titleCase(rule.severity)}</span></td><td>${escapeHtml(rule.remediation)}</td><td><span class="enabled"><i></i>Enabled</span></td></tr>`).join("");
};

const renderExceptions = (result) => {
  const needle = state.exceptionSearch.toLowerCase();
  const rows = result.issues.filter((item) => {
    const matchesText = Object.values(item).join(" ").toLowerCase().includes(needle);
    const matchesSeverity = state.exceptionSeverity === "all" || item.severity === state.exceptionSeverity;
    return matchesText && matchesSeverity;
  });
  const high = result.issues.filter((item) => item.severity === "high").length;
  const medium = result.issues.filter((item) => item.severity === "medium").length;
  $("#exception-summary").innerHTML = `<article><span>Total issues</span><strong>${result.issueCount}</strong></article><article class="danger"><span>High severity</span><strong>${high}</strong></article><article class="warning"><span>Medium severity</span><strong>${medium}</strong></article><article class="success"><span>Rejected records</span><strong>${result.rejectedTotal}</strong></article>`;
  $("#exceptions-table").innerHTML = rows.length ? rows.map((item) => `<tr><td><span class="rule-id">${item.ruleId}</span><small class="domain-label">${titleCase(item.domain)}</small></td><td><strong>${escapeHtml(item.source)}</strong><small class="record-key">${escapeHtml(item.recordKey)}</small></td><td><code>${escapeHtml(item.field)}</code></td><td>${escapeHtml(item.observed)}</td><td>${escapeHtml(item.expected)}</td><td><span class="severity ${item.severity}">${titleCase(item.severity)}</span></td></tr>`).join("") : `<tr><td colspan="6" class="empty-state">No exceptions match these filters.</td></tr>`;
};

const updateRunUi = (result) => {
  $("#run-status").textContent = "Pipeline completed";
  $("#last-run").textContent = `Last run ${formatTime(result.completedAt)}`;
  $("#status-dot").className = "status-dot ready";
  renderOverview(result);
  renderPipeline(result);
  renderExceptions(result);
};

const setRunButtons = (running) => {
  $$('[data-run-trigger], #run-pipeline, #hero-run').forEach((button) => { button.disabled = running; });
  $("#run-pipeline").classList.toggle("loading", running);
  $("#run-pipeline .button-label").textContent = running ? "Running controls" : "Run validation";
};

const runPipeline = async ({ announce = true } = {}) => {
  if (state.running) return;
  state.running = true;
  setRunButtons(true);
  $("#run-status").textContent = "Running controlled pipeline";
  $("#status-dot").className = "status-dot running";
  $$('[data-stage-id]').forEach((element) => element.classList.remove("running", "complete"));
  try {
    const result = await runDataPipeline((stageId, status) => {
      $$(`[data-stage-id="${stageId}"]`).forEach((element) => { element.classList.remove("running", "complete"); element.classList.add(status); });
    });
    state.result = result;
    updateRunUi(result);
    if (announce) showToast(`Pipeline ${result.runId} completed and reconciled.`);
  } catch (error) {
    console.error(error);
    $("#run-status").textContent = "Pipeline error — please retry";
    $("#status-dot").className = "status-dot error";
    showToast("The demo pipeline could not complete. Please retry.");
  } finally {
    state.running = false;
    setRunButtons(false);
  }
};

const csvEscape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const downloadCsv = (name, rows) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const content = [headers.map(csvEscape).join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
  downloadBlob(name, new Blob([content], { type: "text/csv;charset=utf-8" }));
};
const downloadBlob = (name, blob) => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};

const bindEvents = () => {
  $$('[data-view]').forEach((button) => button.addEventListener("click", () => activateView(button.dataset.view)));
  $$('[data-jump]').forEach((button) => button.addEventListener("click", () => activateView(button.dataset.jump)));
  $$('[data-run-trigger], #run-pipeline, #hero-run').forEach((button) => button.addEventListener("click", () => runPipeline()));
  $("#mapping-filter").addEventListener("input", (event) => { state.mappingSearch = event.target.value; renderMapping(); });
  $("#exception-filter").addEventListener("input", (event) => { state.exceptionSearch = event.target.value; if (state.result) renderExceptions(state.result); });
  $("#severity-filter").addEventListener("change", (event) => { state.exceptionSeverity = event.target.value; if (state.result) renderExceptions(state.result); });
  $$("#rule-filters button").forEach((button) => button.addEventListener("click", () => { state.ruleDomain = button.dataset.domain; $$("#rule-filters button").forEach((item) => item.classList.toggle("active", item === button)); renderRules(); }));
  $("#download-mapping").addEventListener("click", () => downloadCsv("dataflow-source-to-target-mapping.csv", fieldMappings));
  $("#download-rules").addEventListener("click", () => downloadCsv("dataflow-rule-catalogue.csv", qualityRules));
  $("#download-exceptions").addEventListener("click", () => state.result && downloadCsv("dataflow-exception-log.csv", state.result.issues));
  $("#download-reconciliation").addEventListener("click", () => state.result && downloadCsv("dataflow-reconciliation.csv", state.result.reconciliations));
  $("#download-sqlite").addEventListener("click", () => state.result && downloadBlob("dataflow-canonical-demo.sqlite", new Blob([state.result.databaseBytes], { type: "application/vnd.sqlite3" })));
  window.addEventListener("hashchange", () => activateView(location.hash.replace("#", "") || "overview", false));
};

document.addEventListener("DOMContentLoaded", async () => {
  renderMapping();
  renderRules();
  bindEvents();
  activateView(location.hash.replace("#", "") || "overview", false);
  await runPipeline({ announce: false });
});
