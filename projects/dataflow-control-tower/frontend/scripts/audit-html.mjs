import { parseHTML } from "linkedom";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const { document } = parseHTML(html);
const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
const dataViews = new Set([...document.querySelectorAll("[data-view]")].map((element) => element.dataset.view));
const panels = new Set([...document.querySelectorAll("[data-view-panel]")].map((element) => element.dataset.viewPanel));
const missingPanels = [...dataViews].filter((view) => !panels.has(view));
const brokenDataJumps = [...document.querySelectorAll("[data-jump]")].map((element) => element.dataset.jump).filter((view) => !panels.has(view));
const links = [...document.querySelectorAll("a[href]")].map((element) => element.getAttribute("href"));
const badLinks = links.filter((link) => !link.startsWith("#") && !link.startsWith("https://"));
const result = {
  title: document.title,
  description: document.querySelector('meta[name="description"]')?.getAttribute("content"),
  author: document.querySelector('meta[name="author"]')?.getAttribute("content"),
  h1Count: document.querySelectorAll("h1").length,
  navViews: [...dataViews],
  panelViews: [...panels],
  duplicateIds,
  missingPanels,
  brokenDataJumps,
  badLinks,
  buttonCount: document.querySelectorAll("button").length,
  tableCount: document.querySelectorAll("table").length,
};

console.log(JSON.stringify(result, null, 2));
if (duplicateIds.length || missingPanels.length || brokenDataJumps.length || badLinks.length || !result.description || result.author !== "Shahied Yon") process.exit(1);
