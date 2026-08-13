import { runDataPipeline } from "../src/pipeline.js";

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const result = await runDataPipeline();

const checks = [
  [result.rawTotal === 36, `Expected 36 raw records; received ${result.rawTotal}`],
  [result.rawTotal === result.acceptedTotal + result.rejectedTotal, "Raw/accepted/rejected reconciliation failed"],
  [result.reconciliations.every((row) => row.variance === 0), "At least one source reconciliation has a variance"],
  [result.databaseBytes.byteLength > 0, "SQLite export is empty"],
  [result.tableCounts.fact_order_line === result.acceptedBySource.sales_orders, "Order table count does not match accepted orders"],
  [result.tableCounts.dq_issue_log === result.issueCount, "Issue log count does not match issues raised"],
  [result.issues.every((item) => /^((ORD|INV|RET|SHP)-\d{3})$/.test(item.ruleId)), "Invalid or non-unique rule ID format"],
  [new Set(result.issues.map((item) => item.ruleId)).size > 1, "Rule execution did not exercise multiple controls"],
  [result.trustedRevenue > 0, "Trusted revenue was not calculated"],
];

const failures = checks.filter(([pass]) => !pass).map(([, message]) => message);
if (failures.length) {
  console.error(JSON.stringify({ failures, result }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  runId: result.runId,
  raw: result.rawTotal,
  accepted: result.acceptedTotal,
  rejected: result.rejectedTotal,
  issues: result.issueCount,
  qualityScore: result.qualityScore,
  trustedRevenue: result.trustedRevenue,
  sqliteBytes: result.databaseBytes.byteLength,
  tables: result.tableCounts,
  reconciliations: result.reconciliations,
}, null, 2));
