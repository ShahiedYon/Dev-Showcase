export type SummaryMetrics = {
  totalRevenue: number;
  orders: number;
  customers: number;
  dataQualityScore: number;
  cleanRecords: number;
  rejectedRecords: number;
  issueCount: number;
  openSupportTickets: number;
  inventoryRiskCount: number;
  latestRun: PipelineStatus;
};

export type PipelineStatus = {
  runId: string;
  status: string;
  startedAt: string;
  finishedAt: string;
  totalRecords: number;
  cleanRecords: number;
  rejectedRecords: number;
  dqScore: number;
};

export type RevenuePoint = {
  month: string;
  revenue: number;
};

export type DQIssue = {
  ruleId: string;
  issue: string;
  severity: string;
  count: number;
};

export type ErrorRecord = {
  sourceTable: string;
  businessKey: string;
  ruleId: string;
  severity: string;
  fieldName: string;
  issue: string;
};

export type OrderRecord = {
  orderId: string;
  orderLineId: string;
  orderDate: string;
  customerId: string;
  canonicalSku: string;
  qty: number;
  currency: string;
  revenue: number;
  status: string;
};

export type InventoryRisk = {
  warehouseId: string;
  canonicalSku: string;
  availableQty: number;
  reorderPoint: number;
  stockStatus: string;
  riskLevel: string;
};

export type AISummary = {
  headline: string;
  score: number;
  findings: string[];
  recommendedActions: string[];
};

import { demoDashboardData, demoSummary } from "./demoData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8010";
const STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === "true";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function runPipeline() {
  if (STATIC_DEMO) {
    return { ...demoSummary.latestRun, issueCount: demoSummary.issueCount };
  }
  return request<PipelineStatus & { issueCount: number }>("/pipeline/run", { method: "POST" });
}

export async function getDashboardData() {
  if (STATIC_DEMO) {
    return demoDashboardData;
  }

  const [summary, revenue, issues, errors, orders, inventoryRisk, aiSummary] = await Promise.all([
    request<SummaryMetrics>("/metrics/summary"),
    request<RevenuePoint[]>("/metrics/revenue-by-month"),
    request<DQIssue[]>("/metrics/top-dq-issues"),
    request<ErrorRecord[]>("/records/errors"),
    request<OrderRecord[]>("/records/orders"),
    request<InventoryRisk[]>("/records/inventory-risk"),
    request<AISummary>("/ai/data-quality-summary"),
  ]);

  return { summary, revenue, issues, errors, orders, inventoryRisk, aiSummary };
}
