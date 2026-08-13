import ExcelJS from "exceljs/dist/exceljs.min.js";

const palette = {
  navy: "FF08182F",
  navySoft: "FF102B50",
  blue: "FF2563EB",
  cyan: "FF16B8D4",
  ink: "FF12203A",
  muted: "FF64748B",
  pale: "FFF3F7FC",
  line: "FFD9E3F0",
  white: "FFFFFFFF",
  red: "FFDD3852",
  redPale: "FFFFF0F3",
  amber: "FFD97800",
  amberPale: "FFFFF5DF",
  green: "FF0B9F76",
  greenPale: "FFEAF8F3",
};

const thinBorder = {
  top: { style: "thin", color: { argb: palette.line } },
  left: { style: "thin", color: { argb: palette.line } },
  bottom: { style: "thin", color: { argb: palette.line } },
  right: { style: "thin", color: { argb: palette.line } },
};

const solidFill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const titleCase = (value) => String(value).replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

const eachCellInRange = (sheet, range, callback) => {
  const [startAddress, endAddress = startAddress] = range.split(":");
  const start = sheet.getCell(startAddress);
  const end = sheet.getCell(endAddress);
  for (let row = start.row; row <= end.row; row += 1) {
    for (let column = start.col; column <= end.col; column += 1) {
      callback(sheet.getCell(row, column));
    }
  }
};

const applyRangeStyle = (sheet, range, style) => {
  eachCellInRange(sheet, range, (cell) => {
    Object.entries(style).forEach(([key, value]) => {
      cell[key] = value;
    });
  });
};

const setRangeValues = (sheet, startAddress, values) => {
  const start = sheet.getCell(startAddress);
  values.forEach((rowValues, rowOffset) => {
    rowValues.forEach((value, columnOffset) => {
      sheet.getCell(start.row + rowOffset, start.col + columnOffset).value = value;
    });
  });
};

const addMetricCard = (sheet, { labelRange, valueRange, label, formula, result, accent, fill }) => {
  sheet.mergeCells(labelRange);
  sheet.mergeCells(valueRange);
  const cardRange = `${labelRange.split(":")[0]}:${valueRange.split(":")[1]}`;
  sheet.getCell(labelRange.split(":")[0]).value = label.toUpperCase();
  sheet.getCell(valueRange.split(":")[0]).value = { formula, result };
  sheet.getCell(valueRange.split(":")[0]).numFmt = "#,##0";
  sheet.getCell(labelRange.split(":")[0]).font = { name: "Aptos", size: 10, bold: true, color: { argb: palette.muted } };
  sheet.getCell(labelRange.split(":")[0]).alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell(valueRange.split(":")[0]).font = { name: "Aptos Display", size: 28, bold: true, color: { argb: accent } };
  sheet.getCell(valueRange.split(":")[0]).alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell(labelRange.split(":")[0]).fill = solidFill(fill);
  sheet.getCell(valueRange.split(":")[0]).fill = solidFill(fill);
  applyRangeStyle(sheet, cardRange, { fill: solidFill(fill), border: thinBorder });
  sheet.getCell(labelRange.split(":")[0]).border = thinBorder;
  sheet.getCell(valueRange.split(":")[0]).border = thinBorder;
};

const createWorkbook = ({ title, subject, description }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Shahied Yon";
  workbook.company = "DataFlow Portfolio";
  workbook.subject = subject;
  workbook.title = title;
  workbook.description = description;
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  workbook.calcProperties.forceFullCalc = true;
  workbook.calcProperties.calcMode = "auto";
  return workbook;
};

const buildStandardSummarySheet = (workbook, {
  title,
  subtitle,
  statusFormula,
  statusResult,
  metrics,
  breakdownTitle,
  breakdownHeader,
  breakdownRows,
  controls,
  guidance,
  footer,
}) => {
  const sheet = workbook.addWorksheet("Summary", {
    properties: { tabColor: { argb: palette.blue } },
    views: [{ showGridLines: false, zoomScale: 90, state: "frozen", ySplit: 3 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });
  sheet.columns = [
    { width: 3 }, { width: 14 }, { width: 14 }, { width: 3 }, { width: 14 }, { width: 14 }, { width: 3 },
    { width: 14 }, { width: 14 }, { width: 3 }, { width: 14 }, { width: 14 }, { width: 3 },
  ];

  sheet.mergeCells("A1:I1");
  sheet.mergeCells("A2:I2");
  sheet.mergeCells("K1:M1");
  sheet.mergeCells("K2:M2");
  sheet.getCell("A1").value = title;
  sheet.getCell("A2").value = subtitle;
  sheet.getCell("K1").value = "CONTROL STATUS";
  sheet.getCell("K2").value = { formula: statusFormula, result: statusResult };
  applyRangeStyle(sheet, "A1:M2", { fill: solidFill(palette.navy) });
  sheet.getCell("A1").font = { name: "Aptos Display", size: 20, bold: true, color: { argb: palette.white } };
  sheet.getCell("A2").font = { name: "Aptos", size: 10, color: { argb: "FFAFC1D8" } };
  sheet.getCell("K1").font = { name: "Aptos", size: 9, bold: true, color: { argb: "FFAFC1D8" } };
  sheet.getCell("K2").font = { name: "Aptos Display", size: 14, bold: true, color: { argb: statusResult === "RECONCILED" || statusResult === "CATALOGUED" || statusResult === "CONTROLLED" ? "FF49D3AA" : "FFFFC857" } };
  sheet.getCell("K1").alignment = sheet.getCell("K2").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 32;
  sheet.getRow(2).height = 24;

  sheet.mergeCells("B4:L4");
  sheet.getCell("B4").value = "FORMULA-DRIVEN CONTROL SUMMARY";
  sheet.getCell("B4").font = { name: "Aptos", size: 10, bold: true, color: { argb: palette.blue } };
  sheet.getRow(4).height = 24;

  const cardRanges = [
    ["B5:C5", "B6:C7"], ["E5:F5", "E6:F7"], ["H5:I5", "H6:I7"], ["K5:L5", "K6:L7"],
  ];
  metrics.forEach((metric, index) => addMetricCard(sheet, {
    labelRange: cardRanges[index][0], valueRange: cardRanges[index][1], ...metric,
  }));
  sheet.getRow(5).height = 27;
  sheet.getRow(6).height = 34;
  sheet.getRow(7).height = 34;

  sheet.mergeCells("B9:F9");
  sheet.mergeCells("H9:L9");
  sheet.getCell("B9").value = breakdownTitle;
  sheet.getCell("H9").value = "FORMULA CONTROL";
  ["B9", "H9"].forEach((address) => {
    sheet.getCell(address).fill = solidFill(palette.navySoft);
    sheet.getCell(address).font = { name: "Aptos", size: 10, bold: true, color: { argb: palette.white } };
  });
  sheet.getRow(9).height = 24;

  setRangeValues(sheet, "B11", [[breakdownHeader, "", "COUNT", "", "SHARE"]]);
  sheet.mergeCells("B11:C11");
  sheet.mergeCells("D11:E11");
  ["B11", "D11", "F11"].forEach((address) => {
    sheet.getCell(address).fill = solidFill(palette.pale);
    sheet.getCell(address).font = { name: "Aptos", size: 9, bold: true, color: { argb: palette.muted } };
    sheet.getCell(address).alignment = { horizontal: address === "B11" ? "left" : "center", vertical: "middle" };
    sheet.getCell(address).border = thinBorder;
  });
  breakdownRows.forEach((item, index) => {
    const row = 12 + index;
    sheet.mergeCells(`B${row}:C${row}`);
    sheet.mergeCells(`D${row}:E${row}`);
    sheet.getCell(`B${row}`).value = item.label;
    sheet.getCell(`D${row}`).value = { formula: item.formula, result: item.result };
    sheet.getCell(`F${row}`).value = { formula: item.shareFormula, result: item.shareResult };
    sheet.getCell(`D${row}`).numFmt = "#,##0";
    sheet.getCell(`F${row}`).numFmt = "0%";
    [`B${row}`, `D${row}`, `F${row}`].forEach((address) => {
      sheet.getCell(address).font = { name: "Aptos", size: 10, bold: address.startsWith("B"), color: { argb: palette.ink } };
      sheet.getCell(address).alignment = { horizontal: address.startsWith("B") ? "left" : "center", vertical: "middle" };
      sheet.getCell(address).border = thinBorder;
    });
  });
  if (breakdownRows.length) {
    sheet.addConditionalFormatting({
      ref: `D12:D${11 + breakdownRows.length}`,
      rules: [{ type: "dataBar", cfvo: [{ type: "min" }, { type: "max" }], color: { argb: palette.blue }, gradient: true, minLength: 8, maxLength: 100 }],
    });
  }

  controls.forEach((item, index) => {
    const row = 12 + index;
    sheet.mergeCells(`H${row}:J${row}`);
    sheet.mergeCells(`K${row}:L${row}`);
    sheet.getCell(`H${row}`).value = item.label;
    sheet.getCell(`K${row}`).value = { formula: item.formula, result: item.result };
    sheet.getCell(`H${row}`).font = { name: "Aptos", size: 10, bold: true, color: { argb: palette.ink } };
    sheet.getCell(`K${row}`).font = { name: "Aptos", size: 10, bold: true, color: { argb: item.accent || palette.ink } };
    sheet.getCell(`K${row}`).alignment = { horizontal: "right", vertical: "middle" };
    sheet.getCell(`H${row}`).border = sheet.getCell(`K${row}`).border = thinBorder;
  });

  sheet.mergeCells("B19:L19");
  sheet.getCell("B19").value = "How to use this workbook";
  sheet.getCell("B19").font = { name: "Aptos", size: 10, bold: true, color: { argb: palette.blue } };
  sheet.mergeCells("B20:L21");
  sheet.getCell("B20").value = guidance;
  sheet.getCell("B20").font = { name: "Aptos", size: 10, color: { argb: palette.muted } };
  sheet.getCell("B20").alignment = { wrapText: true, vertical: "top" };
  sheet.getCell("B20").fill = solidFill(palette.pale);
  sheet.getCell("B20").border = thinBorder;
  sheet.getRow(20).height = 28;
  sheet.mergeCells("B23:L23");
  sheet.getCell("B23").value = footer;
  sheet.getCell("B23").font = { name: "Aptos", size: 8, color: { argb: "FF8190A5" } };
  sheet.getCell("B23").alignment = { horizontal: "center" };
  return sheet;
};

const buildRegisterSheet = (workbook, {
  name,
  title,
  subtitle,
  meta,
  tableName,
  columns,
  rows,
  widths,
  tabColor = palette.cyan,
  severityColumn,
  formulaColumns = [],
  totals,
}) => {
  const sheet = workbook.addWorksheet(name, {
    properties: { tabColor: { argb: tabColor } },
    views: [{ showGridLines: false, zoomScale: 88, state: "frozen", ySplit: 5 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = widths.map((width) => ({ width }));
  const lastColumn = sheet.getColumn(columns.length).letter;
  sheet.mergeCells(`A1:${lastColumn}1`);
  sheet.mergeCells(`A2:${lastColumn}2`);
  sheet.mergeCells(`A3:${lastColumn}3`);
  sheet.getCell("A1").value = title;
  sheet.getCell("A2").value = subtitle;
  sheet.getCell("A3").value = meta;
  applyRangeStyle(sheet, `A1:${lastColumn}2`, { fill: solidFill(palette.navy) });
  sheet.getCell("A1").font = { name: "Aptos Display", size: 20, bold: true, color: { argb: palette.white } };
  sheet.getCell("A2").font = { name: "Aptos", size: 10, color: { argb: "FFAFC1D8" } };
  sheet.getCell("A3").fill = solidFill(palette.pale);
  sheet.getCell("A3").font = { name: "Aptos", size: 9, bold: true, color: { argb: palette.blue } };
  sheet.getCell("A3").alignment = { vertical: "middle" };
  sheet.getRow(1).height = 32;
  sheet.getRow(2).height = 24;
  sheet.getRow(3).height = 22;
  sheet.addTable({
    name: tableName,
    ref: "A5",
    headerRow: true,
    totalsRow: Boolean(totals),
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: columns.map((column, index) => ({ name: column, ...(totals?.[index] || {}) })),
    rows,
  });
  sheet.getRow(5).height = 28;
  sheet.getRow(5).font = { name: "Aptos", size: 10, bold: true, color: { argb: palette.white } };
  const lastDataRow = 5 + rows.length;
  const lastRow = lastDataRow + (totals ? 1 : 0);
  for (let row = 6; row <= lastDataRow; row += 1) {
    sheet.getRow(row).height = 31;
    sheet.getRow(row).font = { name: "Aptos", size: 10, color: { argb: palette.ink } };
    sheet.getRow(row).alignment = { vertical: "middle", wrapText: true };
    formulaColumns.forEach(({ column, makeFormula, results }) => {
      sheet.getCell(row, column).value = { formula: makeFormula(row), result: results[row - 6] };
    });
  }
  if (severityColumn) {
    const letter = sheet.getColumn(severityColumn).letter;
    sheet.addConditionalFormatting({
      ref: `${letter}6:${letter}${lastDataRow}`,
      rules: [
        { type: "expression", formulae: [`LOWER($${letter}6)="high"`], style: { fill: solidFill(palette.redPale), font: { bold: true, color: { argb: palette.red } } } },
        { type: "expression", formulae: [`LOWER($${letter}6)="medium"`], style: { fill: solidFill(palette.amberPale), font: { bold: true, color: { argb: palette.amber } } } },
      ],
    });
    sheet.dataValidations.add(`${letter}6:${letter}${lastRow + 100}`, { type: "list", allowBlank: false, formulae: ['"high,medium"'] });
  }
  sheet.headerFooter.oddFooter = `&LDataFlow | Shahied Yon&C${title}&RPage &P of &N`;
  return sheet;
};

const buildSummarySheet = (workbook, result) => {
  const sheet = workbook.addWorksheet("Summary", {
    properties: { tabColor: { argb: palette.blue } },
    views: [{ showGridLines: false, zoomScale: 90, state: "frozen", ySplit: 3 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });

  sheet.columns = [
    { key: "gutter", width: 3 }, { key: "b", width: 14 }, { key: "c", width: 14 }, { key: "d", width: 3 },
    { key: "e", width: 14 }, { key: "f", width: 14 }, { key: "g", width: 3 }, { key: "h", width: 14 },
    { key: "i", width: 14 }, { key: "j", width: 3 }, { key: "k", width: 14 }, { key: "l", width: 14 },
    { key: "m", width: 3 },
  ];

  sheet.mergeCells("A1:I1");
  sheet.mergeCells("A2:I2");
  sheet.mergeCells("K1:M1");
  sheet.mergeCells("K2:M2");
  sheet.getCell("A1").value = "DATAFLOW | EXCEPTION CONTROL PACK";
  sheet.getCell("A2").value = "Formula-driven quality summary and controlled remediation register";
  sheet.getCell("K1").value = "CONTROL STATUS";
  sheet.getCell("K2").value = { formula: 'IF(K14=0,"RECONCILED","CHECK")', result: "RECONCILED" };
  applyRangeStyle(sheet, "A1:M2", { fill: solidFill(palette.navy) });
  sheet.getCell("A1").font = { name: "Aptos Display", size: 20, bold: true, color: { argb: palette.white } };
  sheet.getCell("A2").font = { name: "Aptos", size: 10, color: { argb: "FFAFC1D8" } };
  sheet.getCell("K1").font = { name: "Aptos", size: 9, bold: true, color: { argb: "FFAFC1D8" } };
  sheet.getCell("K2").font = { name: "Aptos Display", size: 14, bold: true, color: { argb: "FF49D3AA" } };
  sheet.getCell("K1").alignment = sheet.getCell("K2").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 32;
  sheet.getRow(2).height = 24;

  sheet.mergeCells("B4:L4");
  sheet.getCell("B4").value = "CONTROLLED REMEDIATION SUMMARY";
  sheet.getCell("B4").font = { name: "Aptos", size: 10, bold: true, color: { argb: palette.blue } };
  sheet.getCell("B4").alignment = { vertical: "middle" };
  sheet.getRow(4).height = 24;

  const high = result.issues.filter((item) => item.severity === "high").length;
  const medium = result.issues.filter((item) => item.severity === "medium").length;
  addMetricCard(sheet, { labelRange: "B5:C5", valueRange: "B6:C7", label: "Total issues", formula: "ROWS(ExceptionTable[Rule ID])", result: result.issueCount, accent: palette.ink, fill: palette.white });
  addMetricCard(sheet, { labelRange: "E5:F5", valueRange: "E6:F7", label: "High severity", formula: 'COUNTIF(ExceptionTable[Severity],"high")', result: high, accent: palette.red, fill: palette.redPale });
  addMetricCard(sheet, { labelRange: "H5:I5", valueRange: "H6:I7", label: "Medium severity", formula: 'COUNTIF(ExceptionTable[Severity],"medium")', result: medium, accent: palette.amber, fill: palette.amberPale });
  addMetricCard(sheet, { labelRange: "K5:L5", valueRange: "K6:L7", label: "Rejected records", formula: "ROWS(RejectedRecordTable[Record Key])", result: result.rejectedTotal, accent: palette.green, fill: palette.greenPale });
  sheet.getRow(5).height = 27;
  sheet.getRow(6).height = 34;
  sheet.getRow(7).height = 34;

  sheet.mergeCells("B9:F9");
  sheet.mergeCells("H9:L9");
  sheet.getCell("B9").value = "ISSUES BY DOMAIN";
  sheet.getCell("H9").value = "FORMULA CONTROL";
  ["B9", "H9"].forEach((cell) => {
    sheet.getCell(cell).fill = solidFill(palette.navySoft);
    sheet.getCell(cell).font = { name: "Aptos", size: 10, bold: true, color: { argb: palette.white } };
    sheet.getCell(cell).alignment = { vertical: "middle" };
  });
  sheet.getRow(9).height = 24;

  setRangeValues(sheet, "B11", [["DOMAIN", "", "ISSUE COUNT", "", "SHARE"]]);
  sheet.mergeCells("B11:C11");
  sheet.mergeCells("D11:E11");
  ["B11", "D11", "F11"].forEach((cell) => {
    sheet.getCell(cell).fill = solidFill(palette.pale);
    sheet.getCell(cell).font = { name: "Aptos", size: 9, bold: true, color: { argb: palette.muted } };
    sheet.getCell(cell).alignment = { horizontal: cell === "B11" ? "left" : "center", vertical: "middle" };
    sheet.getCell(cell).border = thinBorder;
  });

  const domains = ["orders", "inventory", "returns", "shipments"];
  domains.forEach((domain, index) => {
    const row = 12 + index;
    const count = result.issues.filter((item) => item.domain === domain).length;
    sheet.mergeCells(`B${row}:C${row}`);
    sheet.mergeCells(`D${row}:E${row}`);
    sheet.getCell(`B${row}`).value = titleCase(domain);
    sheet.getCell(`D${row}`).value = { formula: `COUNTIF(ExceptionTable[Domain],B${row})`, result: count };
    sheet.getCell(`F${row}`).value = { formula: `IFERROR(D${row}/$B$6,0)`, result: result.issueCount ? count / result.issueCount : 0 };
    sheet.getCell(`D${row}`).numFmt = "#,##0";
    sheet.getCell(`F${row}`).numFmt = "0%";
    [`B${row}`, `D${row}`, `F${row}`].forEach((cell) => {
      sheet.getCell(cell).font = { name: "Aptos", size: 10, color: { argb: palette.ink }, bold: cell.startsWith("B") };
      sheet.getCell(cell).alignment = { horizontal: cell.startsWith("B") ? "left" : "center", vertical: "middle" };
      sheet.getCell(cell).border = thinBorder;
    });
  });
  sheet.addConditionalFormatting({
    ref: "D12:D15",
    rules: [{
      type: "dataBar",
      cfvo: [{ type: "min" }, { type: "max" }],
      color: { argb: palette.blue },
      gradient: true,
      minLength: 8,
      maxLength: 100,
    }],
  });

  const controlRows = [
    ["Total issues", { formula: "B6", result: result.issueCount }],
    ["Severity total", { formula: "E6+H6", result: high + medium }],
    ["Control variance", { formula: "K12-K13", result: 0 }],
    ["Reconciliation", { formula: 'IF(K14=0,"Balanced","Investigate")', result: "Balanced" }],
  ];
  controlRows.forEach(([label, value], index) => {
    const row = 12 + index;
    sheet.mergeCells(`H${row}:J${row}`);
    sheet.mergeCells(`K${row}:L${row}`);
    sheet.getCell(`H${row}`).value = label;
    sheet.getCell(`K${row}`).value = value;
    sheet.getCell(`H${row}`).font = { name: "Aptos", size: 10, bold: true, color: { argb: palette.ink } };
    sheet.getCell(`K${row}`).font = { name: "Aptos", size: 10, bold: true, color: { argb: row === 15 ? palette.green : palette.ink } };
    sheet.getCell(`K${row}`).alignment = { horizontal: "right", vertical: "middle" };
    sheet.getCell(`H${row}`).border = sheet.getCell(`K${row}`).border = thinBorder;
  });

  sheet.mergeCells("B18:L18");
  sheet.getCell("B18").value = "How to use this workbook";
  sheet.getCell("B18").font = { name: "Aptos", size: 10, bold: true, color: { argb: palette.blue } };
  sheet.mergeCells("B19:L20");
  sheet.getCell("B19").value = "Filter and remediate rows on the Exceptions sheet. The four headline metrics, domain counts, shares and reconciliation control are formulas linked to the Excel table, so they recalculate when the register changes.";
  sheet.getCell("B19").font = { name: "Aptos", size: 10, color: { argb: palette.muted } };
  sheet.getCell("B19").alignment = { wrapText: true, vertical: "top" };
  sheet.getCell("B19").fill = solidFill(palette.pale);
  sheet.getCell("B19").border = thinBorder;
  sheet.getRow(19).height = 28;
  sheet.getRow(20).height = 18;
  sheet.mergeCells("B22:L22");
  sheet.getCell("B22").value = `Run ${result.runId} | Generated ${result.completedAt.toISOString()} | Synthetic portfolio data`;
  sheet.getCell("B22").font = { name: "Aptos", size: 8, color: { argb: "FF8190A5" } };
  sheet.getCell("B22").alignment = { horizontal: "center" };
  return sheet;
};

const buildExceptionsSheet = (workbook, result) => {
  const sheet = workbook.addWorksheet("Exceptions", {
    properties: { tabColor: { argb: palette.red } },
    views: [{ showGridLines: false, zoomScale: 85, state: "frozen", ySplit: 5 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = [
    { key: "ruleId", width: 13 }, { key: "domain", width: 14 }, { key: "source", width: 24 },
    { key: "recordKey", width: 18 }, { key: "field", width: 19 }, { key: "observed", width: 22 },
    { key: "expected", width: 42 }, { key: "severity", width: 14 }, { key: "reason", width: 60 },
  ];
  sheet.mergeCells("A1:I1");
  sheet.mergeCells("A2:I2");
  sheet.getCell("A1").value = "EXCEPTION WORKBENCH";
  sheet.getCell("A2").value = "Rejected records retain the business key, failed field, observed value, expected result and severity.";
  applyRangeStyle(sheet, "A1:I2", { fill: solidFill(palette.navy) });
  sheet.getCell("A1").font = { name: "Aptos Display", size: 20, bold: true, color: { argb: palette.white } };
  sheet.getCell("A2").font = { name: "Aptos", size: 10, color: { argb: "FFAFC1D8" } };
  sheet.getRow(1).height = 32;
  sheet.getRow(2).height = 24;
  sheet.mergeCells("A3:I3");
  sheet.getCell("A3").value = `Run ${result.runId} | ${result.issueCount} issues | ${result.rejectedTotal} rejected records | Formula summary available on the Summary sheet`;
  sheet.getCell("A3").fill = solidFill(palette.pale);
  sheet.getCell("A3").font = { name: "Aptos", size: 9, bold: true, color: { argb: palette.blue } };
  sheet.getCell("A3").alignment = { vertical: "middle" };
  sheet.getRow(3).height = 22;

  const rows = result.issues.map((item) => [
    item.ruleId,
    item.domain,
    item.source,
    item.recordKey,
    item.field,
    /^-?\d+(\.\d+)?$/.test(String(item.observed)) ? Number(item.observed) : item.observed,
    item.expected,
    item.severity,
    item.reason,
  ]);
  sheet.addTable({
    name: "ExceptionTable",
    ref: "A5",
    headerRow: true,
    totalsRow: true,
    style: { theme: "TableStyleMedium2", showRowStripes: true, showFirstColumn: false, showLastColumn: false },
    columns: [
      { name: "Rule ID", totalsRowLabel: "Total issues" },
      { name: "Domain" }, { name: "Source" }, { name: "Record Key" }, { name: "Field" },
      { name: "Observed" }, { name: "Expected" }, { name: "Severity", totalsRowFunction: "count" }, { name: "Reason" },
    ],
    rows,
  });
  sheet.getRow(5).height = 28;
  sheet.getRow(5).font = { name: "Aptos", size: 10, bold: true, color: { argb: palette.white } };
  sheet.getRow(5).alignment = { vertical: "middle" };
  for (let row = 6; row < 6 + rows.length; row += 1) {
    sheet.getRow(row).height = 31;
    sheet.getRow(row).font = { name: "Aptos", size: 10, color: { argb: palette.ink } };
    sheet.getRow(row).alignment = { vertical: "middle", wrapText: true };
    sheet.getCell(`A${row}`).font = { name: "Aptos", size: 10, bold: true, color: { argb: palette.blue } };
    sheet.getCell(`H${row}`).font = { name: "Aptos", size: 9, bold: true, color: { argb: palette.ink } };
    sheet.getCell(`H${row}`).alignment = { horizontal: "center", vertical: "middle" };
  }
  const lastDataRow = Math.max(6, 5 + rows.length);
  sheet.addConditionalFormatting({
    ref: `H6:H${lastDataRow}`,
    rules: [
      { type: "expression", formulae: ['LOWER($H6)="high"'], style: { fill: solidFill(palette.redPale), font: { bold: true, color: { argb: palette.red } } } },
      { type: "expression", formulae: ['LOWER($H6)="medium"'], style: { fill: solidFill(palette.amberPale), font: { bold: true, color: { argb: palette.amber } } } },
    ],
  });
  sheet.dataValidations.add(`H6:H${lastDataRow + 100}`, { type: "list", allowBlank: false, formulae: ['"high,medium"'] });
  sheet.headerFooter.oddFooter = "&LDataFlow | Shahied Yon&CControlled remediation register&RPage &P of &N";
  return sheet;
};

const buildRejectedRecordsSheet = (workbook, result) => {
  const grouped = new Map();
  result.issues.forEach((item) => {
    const existing = grouped.get(item.recordKey) || {
      recordKey: item.recordKey,
      domain: item.domain,
      source: item.source,
      issueCount: 0,
      severity: "medium",
    };
    existing.issueCount += 1;
    if (item.severity === "high") existing.severity = "high";
    grouped.set(item.recordKey, existing);
  });
  const rows = [...grouped.values()];
  buildRegisterSheet(workbook, {
    name: "Rejected Records",
    title: "REJECTED RECORD REGISTER",
    subtitle: "One auditable row per rejected business record, linked back to its exception count and highest severity.",
    meta: `${rows.length} rejected records | ${result.issueCount} linked issues | Formula summary available on the Summary sheet`,
    tableName: "RejectedRecordTable",
    columns: ["Record Key", "Domain", "Source", "Issue Count", "Highest Severity"],
    rows: rows.map((item) => [item.recordKey, item.domain, item.source, item.issueCount, item.severity]),
    widths: [24, 18, 24, 16, 20],
    severityColumn: 5,
    tabColor: palette.green,
    formulaColumns: [{
      column: 4,
      makeFormula: (row) => `COUNTIF(ExceptionTable[Record Key],A${row})`,
      results: rows.map((item) => item.issueCount),
    }],
    totals: [{ totalsRowLabel: "Rejected records" }, {}, {}, { totalsRowFunction: "sum" }, { totalsRowFunction: "count" }],
  });
};

const buildGuideSheet = (workbook) => {
  const sheet = workbook.addWorksheet("Guide", {
    properties: { tabColor: { argb: palette.cyan } },
    views: [{ showGridLines: false, zoomScale: 95 }],
  });
  sheet.columns = [{ width: 3 }, { width: 26 }, { width: 64 }, { width: 28 }, { width: 3 }];
  sheet.mergeCells("A1:E1");
  sheet.mergeCells("A2:E2");
  sheet.getCell("A1").value = "WORKBOOK GUIDE";
  sheet.getCell("A2").value = "Auditable, formula-driven outputs for controlled data-quality remediation";
  applyRangeStyle(sheet, "A1:E2", { fill: solidFill(palette.navy) });
  sheet.getCell("A1").font = { name: "Aptos Display", size: 20, bold: true, color: { argb: palette.white } };
  sheet.getCell("A2").font = { name: "Aptos", size: 10, color: { argb: "FFAFC1D8" } };
  sheet.getRow(1).height = 32;
  sheet.getRow(2).height = 24;
  sheet.mergeCells("B4:D4");
  sheet.getCell("B4").value = "Workbook structure";
  sheet.getCell("B4").font = { name: "Aptos", size: 11, bold: true, color: { argb: palette.blue } };
  const guideRows = [
    ["Summary", "Recruiter-ready control dashboard. Every headline metric is a live Excel formula linked to the Exceptions table.", "Presentation and reconciliation"],
    ["Exceptions", "Filterable Excel table containing rule, source, business key, observed value, expected value, severity and reason.", "Remediation workbench"],
    ["Rejected Records", "One row per rejected business key, with a formula-linked exception count and highest severity.", "Record-level control"],
    ["Formula behaviour", "Add or remove rows inside ExceptionTable and Excel recalculates issue counts, severity counts, domain shares and the control variance.", "Auditable calculations"],
    ["Data privacy", "Synthetic demonstration data only. No employer, client or confidential information is included.", "Safe portfolio use"],
  ];
  setRangeValues(sheet, "B6", [["SECTION", "PURPOSE", "CONTROL VALUE"]]);
  applyRangeStyle(sheet, "B6:D6", {
    fill: solidFill(palette.navySoft),
    font: { name: "Aptos", size: 10, bold: true, color: { argb: palette.white } },
  });
  guideRows.forEach((values, index) => {
    const row = 7 + index;
    setRangeValues(sheet, `B${row}`, [values]);
    applyRangeStyle(sheet, `B${row}:D${row}`, {
      fill: solidFill(index % 2 ? palette.pale : palette.white),
      font: { name: "Aptos", size: 10, color: { argb: palette.ink } },
      alignment: { vertical: "middle", wrapText: true },
      border: thinBorder,
    });
    sheet.getRow(row).height = 42;
  });
  sheet.mergeCells("B13:D13");
  sheet.getCell("B13").value = "Portfolio: https://sydataflow.netlify.app/";
  sheet.getCell("B13").font = { name: "Aptos", size: 10, bold: true, color: { argb: palette.blue } };
  sheet.getCell("B13").alignment = { horizontal: "center" };
  return sheet;
};

export async function createExceptionWorkbook(result) {
  const workbook = createWorkbook({
    title: "DataFlow Exception Control Pack",
    subject: "Formula-driven data-quality exception control pack",
    description: "Synthetic data-quality portfolio workbook with formula-driven summary metrics.",
  });
  buildSummarySheet(workbook, result);
  buildExceptionsSheet(workbook, result);
  buildRejectedRecordsSheet(workbook, result);
  buildGuideSheet(workbook);
  return workbook.xlsx.writeBuffer();
}

export async function createMappingWorkbook(mappings) {
  const workbook = createWorkbook({
    title: "DataFlow Source-to-Target Mapping Control Pack",
    subject: "Formula-driven source-to-target mapping catalogue",
    description: "Controlled mapping workbook with formula-driven coverage metrics.",
  });
  const sources = [...new Set(mappings.map((item) => item.source))];
  const targetTables = [...new Set(mappings.map((item) => item.target.split(".")[0]))];
  const controlsLinked = mappings.filter((item) => item.control).length;
  buildStandardSummarySheet(workbook, {
    title: "DATAFLOW | MAPPING CONTROL PACK",
    subtitle: "Source-to-target lineage, transformation logic and linked quality controls",
    statusFormula: 'IF(K14=0,"CONTROLLED","CHECK")',
    statusResult: "CONTROLLED",
    metrics: [
      { label: "Mapped fields", formula: "ROWS(MappingTable[Source Field])", result: mappings.length, accent: palette.ink, fill: palette.white },
      { label: "Source systems", formula: 'COUNTIF(D12:D16,">0")', result: sources.length, accent: palette.blue, fill: palette.pale },
      { label: "Lineage gaps", formula: "COUNTBLANK(MappingTable[Target Field])+COUNTBLANK(MappingTable[Control ID])", result: 0, accent: palette.green, fill: palette.greenPale },
      { label: "Controls linked", formula: 'COUNTIF(MappingTable[Control ID],"<>")', result: controlsLinked, accent: palette.green, fill: palette.greenPale },
    ],
    breakdownTitle: "MAPPINGS BY SOURCE",
    breakdownHeader: "SOURCE SYSTEM",
    breakdownRows: sources.map((source, index) => {
      const count = mappings.filter((item) => item.source === source).length;
      const row = 12 + index;
      return { label: source, formula: `COUNTIF(MappingTable[Source System],B${row})`, result: count, shareFormula: `IFERROR(D${row}/$B$6,0)`, shareResult: count / mappings.length };
    }),
    controls: [
      { label: "Detail rows", formula: "ROWS(MappingTable[Source Field])", result: mappings.length },
      { label: "Control-linked rows", formula: 'COUNTIF(MappingTable[Control ID],"<>")', result: controlsLinked },
      { label: "Coverage variance", formula: "K12-K13", result: mappings.length - controlsLinked },
      { label: "Reconciliation", formula: 'IF(K14=0,"Balanced","Investigate")', result: "Balanced", accent: palette.green },
    ],
    guidance: "Filter the Mapping Register to trace each source field through its transformation into the canonical target. Summary coverage metrics are Excel formulas linked to MappingTable and recalculate as the register changes.",
    footer: `Generated ${new Date().toISOString()} | Synthetic portfolio mapping catalogue`,
  });
  buildRegisterSheet(workbook, {
    name: "Mapping Register",
    title: "SOURCE-TO-TARGET MAPPING REGISTER",
    subtitle: "Field-level lineage from source systems through governed transformations to canonical targets.",
    meta: `${mappings.length} mapped fields | ${sources.length} source systems | ${targetTables.length} target tables | Formula summary available on the Summary sheet`,
    tableName: "MappingTable",
    columns: ["Source System", "Source Field", "Transformation", "Target Table", "Target Field", "Control ID"],
    rows: mappings.map((item) => {
      const [targetTable, ...targetField] = item.target.split(".");
      return [item.source, item.field, item.transformation, targetTable, targetField.join("."), item.control];
    }),
    widths: [22, 27, 54, 27, 36, 15],
    totals: [{ totalsRowLabel: "Mapped fields" }, {}, {}, {}, {}, { totalsRowFunction: "count" }],
  });
  return workbook.xlsx.writeBuffer();
}

export async function createRuleCatalogueWorkbook(rules) {
  const workbook = createWorkbook({
    title: "DataFlow Quality Rule Catalogue",
    subject: "Formula-driven data-quality rule catalogue",
    description: "Controlled rule catalogue with formula-driven severity and domain metrics.",
  });
  const high = rules.filter((item) => item.severity === "high").length;
  const medium = rules.filter((item) => item.severity === "medium").length;
  const domains = [...new Set(rules.map((item) => item.domain))];
  buildStandardSummarySheet(workbook, {
    title: "DATAFLOW | RULE CONTROL PACK",
    subtitle: "Governed quality rules, severity profile and remediation ownership",
    statusFormula: 'IF(K14=0,"CATALOGUED","CHECK")',
    statusResult: "CATALOGUED",
    metrics: [
      { label: "Total rules", formula: "ROWS(RuleTable[Rule ID])", result: rules.length, accent: palette.ink, fill: palette.white },
      { label: "High severity", formula: 'COUNTIF(RuleTable[Severity],"high")', result: high, accent: palette.red, fill: palette.redPale },
      { label: "Medium severity", formula: 'COUNTIF(RuleTable[Severity],"medium")', result: medium, accent: palette.amber, fill: palette.amberPale },
      { label: "Domains covered", formula: 'COUNTIF(D12:D15,">0")', result: domains.length, accent: palette.green, fill: palette.greenPale },
    ],
    breakdownTitle: "RULES BY DOMAIN",
    breakdownHeader: "DOMAIN",
    breakdownRows: domains.map((domain, index) => {
      const count = rules.filter((item) => item.domain === domain).length;
      const row = 12 + index;
      return { label: titleCase(domain), formula: `COUNTIF(RuleTable[Domain],B${row})`, result: count, shareFormula: `IFERROR(D${row}/$B$6,0)`, shareResult: count / rules.length };
    }),
    controls: [
      { label: "Catalogue rows", formula: "ROWS(RuleTable[Rule ID])", result: rules.length },
      { label: "Severity total", formula: "E6+H6", result: high + medium },
      { label: "Control variance", formula: "K12-K13", result: 0 },
      { label: "Reconciliation", formula: 'IF(K14=0,"Balanced","Investigate")', result: "Balanced", accent: palette.green },
    ],
    guidance: "Use the Rule Catalogue as the governed definition of each control and its remediation action. The four headline metrics, domain distribution and reconciliation check are formulas linked to RuleTable.",
    footer: `Generated ${new Date().toISOString()} | Synthetic portfolio rule catalogue`,
  });
  buildRegisterSheet(workbook, {
    name: "Rule Catalogue",
    title: "DATA-QUALITY RULE CATALOGUE",
    subtitle: "Governed control definitions with severity, business intent and corrective action.",
    meta: `${rules.length} active rules | ${high} high severity | ${medium} medium severity | Formula summary available on the Summary sheet`,
    tableName: "RuleTable",
    columns: ["Rule ID", "Domain", "Severity", "Business Rule", "Remediation"],
    rows: rules.map((item) => [item.id, item.domain, item.severity, item.rule, item.remediation]),
    widths: [15, 18, 16, 58, 62],
    severityColumn: 3,
    tabColor: palette.amber,
    totals: [{ totalsRowLabel: "Total rules" }, {}, { totalsRowFunction: "count" }, {}, {}],
  });
  return workbook.xlsx.writeBuffer();
}

export async function createReconciliationWorkbook(result) {
  const workbook = createWorkbook({
    title: "DataFlow Reconciliation Control Pack",
    subject: "Formula-driven data-pipeline reconciliation",
    description: "Run reconciliation workbook with formula-driven source disposition controls.",
  });
  const rows = result.reconciliations;
  buildStandardSummarySheet(workbook, {
    title: "DATAFLOW | RECONCILIATION CONTROL PACK",
    subtitle: "Source-level proof that every raw record is accepted or controlled as rejected",
    statusFormula: 'IF(K14=0,"RECONCILED","CHECK")',
    statusResult: "RECONCILED",
    metrics: [
      { label: "Raw records", formula: "SUM(ReconciliationTable[Raw])", result: result.rawTotal, accent: palette.ink, fill: palette.white },
      { label: "Accepted", formula: "SUM(ReconciliationTable[Accepted])", result: result.acceptedTotal, accent: palette.green, fill: palette.greenPale },
      { label: "Rejected", formula: "SUM(ReconciliationTable[Rejected])", result: result.rejectedTotal, accent: palette.red, fill: palette.redPale },
      { label: "Source feeds", formula: "ROWS(ReconciliationTable[Source])", result: rows.length, accent: palette.blue, fill: palette.pale },
    ],
    breakdownTitle: "RAW RECORDS BY SOURCE",
    breakdownHeader: "SOURCE FEED",
    breakdownRows: rows.map((item, index) => {
      const row = 12 + index;
      return {
        label: titleCase(item.source),
        formula: `SUMIF(ReconciliationTable[Source],"${item.source}",ReconciliationTable[Raw])`,
        result: item.raw,
        shareFormula: `IFERROR(D${row}/$B$6,0)`,
        shareResult: item.raw / result.rawTotal,
      };
    }),
    controls: [
      { label: "Raw total", formula: "B6", result: result.rawTotal },
      { label: "Disposition total", formula: "E6+H6", result: result.acceptedTotal + result.rejectedTotal },
      { label: "Control variance", formula: "K12-K13", result: 0 },
      { label: "Reconciliation", formula: 'IF(K14=0,"Balanced","Investigate")', result: "Balanced", accent: palette.green },
    ],
    guidance: "Review the Reconciliation Register for source-level disposition. Variance and status are formulas on every row; all dashboard totals and the final reconciliation control are formulas linked to ReconciliationTable.",
    footer: `Run ${result.runId} | Generated ${result.completedAt.toISOString()} | Synthetic portfolio data`,
  });
  buildRegisterSheet(workbook, {
    name: "Reconciliation Register",
    title: "SOURCE RECONCILIATION REGISTER",
    subtitle: "Raw equals accepted plus rejected for every source feed, with zero unexplained variance.",
    meta: `Run ${result.runId} | ${result.rawTotal} raw | ${result.acceptedTotal} accepted | ${result.rejectedTotal} rejected | Formula summary available on the Summary sheet`,
    tableName: "ReconciliationTable",
    columns: ["Source", "Raw", "Accepted", "Rejected", "Variance", "Status"],
    rows: rows.map((item) => [item.source, item.raw, item.accepted, item.rejected, item.variance, titleCase(item.status)]),
    widths: [28, 16, 16, 16, 16, 20],
    tabColor: palette.green,
    totals: [
      { totalsRowLabel: "Total" },
      { totalsRowFunction: "sum" },
      { totalsRowFunction: "sum" },
      { totalsRowFunction: "sum" },
      { totalsRowFunction: "sum" },
      { totalsRowLabel: "Balanced" },
    ],
    formulaColumns: [
      { column: 5, makeFormula: (row) => `B${row}-C${row}-D${row}`, results: rows.map((item) => item.variance) },
      { column: 6, makeFormula: (row) => `IF(E${row}=0,"Balanced","Investigate")`, results: rows.map((item) => item.variance === 0 ? "Balanced" : "Investigate") },
    ],
  });
  return workbook.xlsx.writeBuffer();
}
