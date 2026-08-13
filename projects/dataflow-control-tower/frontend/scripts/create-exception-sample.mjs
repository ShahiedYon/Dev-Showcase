import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createExceptionWorkbook,
  createMappingWorkbook,
  createReconciliationWorkbook,
  createRuleCatalogueWorkbook,
} from "../src/exception-workbook.js";
import { fieldMappings, qualityRules } from "../src/data.js";
import { runDataPipeline } from "../src/pipeline.js";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDir = resolve(projectRoot, "../outputs/excel_control_packs");
const result = await runDataPipeline();
const workbooks = [
  ["dataflow-exception-control-pack.xlsx", () => createExceptionWorkbook(result)],
  ["dataflow-source-to-target-mapping.xlsx", () => createMappingWorkbook(fieldMappings)],
  ["dataflow-rule-catalogue.xlsx", () => createRuleCatalogueWorkbook(qualityRules)],
  ["dataflow-reconciliation-control-pack.xlsx", () => createReconciliationWorkbook(result)],
];

await mkdir(outputDir, { recursive: true });
for (const [fileName, create] of workbooks) {
  await writeFile(resolve(outputDir, fileName), Buffer.from(await create()));
}

console.log(JSON.stringify({
  outputDir,
  files: workbooks.map(([fileName]) => fileName),
  issueCount: result.issueCount,
  highSeverity: result.issues.filter((item) => item.severity === "high").length,
  mediumSeverity: result.issues.filter((item) => item.severity === "medium").length,
  rejectedRecords: result.rejectedTotal,
}));
