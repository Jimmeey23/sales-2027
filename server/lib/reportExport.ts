import ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify/sync';
import type { ReportColumnType } from './reporting.js';

const safe = (value: any) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return JSON.stringify(value);
  // Spreadsheet applications may execute text beginning with a formula marker.
  if (typeof value === 'string' && /^\s*[=+\-@]/.test(value)) return `'${value}`;
  return value;
};
const excelFormat = (type?: ReportColumnType) =>
  type === 'currency'
    ? '₹#,##0.00;[Red]-₹#,##0.00'
    : type === 'percent'
      ? '0.0"%"'
      : type === 'ratio'
        ? '0.0%'
        : type === 'number'
          ? '#,##0.00'
          : '@';

export async function sendReportExport(res: any, result: any, format: 'csv' | 'xlsx') {
  const filename = `p57-${result.definition.id}-${result.options.from}-to-${result.options.to}${result.options.studio ? `-studio-${result.options.studio}` : ''}.${format}`;
  if (format === 'csv') {
    const csv = stringify(
      result.rows.map((row: any) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, safe(value)]))),
      {
        header: true,
        columns: result.columns.map((column: any) => ({ key: column.key, header: column.label })),
      },
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(`\uFEFF${csv}`);
    return;
  }
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'P57 Sales Intelligence Studio';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = result.definition.name;
  workbook.description = result.definition.description;
  const summary = workbook.addWorksheet('Management summary', { views: [{ showGridLines: false }] });
  summary.properties.tabColor = { argb: 'FF6857E5' };
  summary.mergeCells('A1:D1');
  summary.getCell('A1').value = 'P57 · SALES INTELLIGENCE';
  summary.getCell('A1').font = { bold: true, size: 11, color: { argb: 'FF6857E5' } };
  summary.mergeCells('A2:D2');
  summary.getCell('A2').value = result.definition.name;
  summary.getCell('A2').font = { bold: true, size: 22, color: { argb: 'FF24202E' } };
  summary.mergeCells('A3:D3');
  summary.getCell('A3').value = result.definition.description;
  summary.getCell('A3').alignment = { wrapText: true, vertical: 'top' };
  summary.getRow(3).height = 36;
  const metadata = [
    ['Evidence', result.definition.evidence],
    ['Period', `${result.options.from} → ${result.options.to}`],
    ['Studio scope', result.options.studio || 'All accessible studios'],
    ['Generated', result.generatedAt],
    ['Rows', `${result.returnedRows} of ${result.totalRows}`],
    ['Sort', result.options.sort ? `${result.options.sort} · ${result.options.direction}` : 'Source order'],
  ];
  metadata.forEach(([label, value], index) => {
    const row = summary.getRow(index + 5);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true, color: { argb: 'FF716D7C' } };
    row.getCell(2).value = safe(value);
  });
  summary.getRow(12).values = ['Measure', 'Value', '', ''];
  summary.getRow(12).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summary.getRow(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6857E5' } };
  result.summary.forEach((metric: any, index: number) => {
    const row = summary.getRow(13 + index);
    row.getCell(1).value = metric.label;
    row.getCell(2).value = safe(metric.value);
    row.getCell(2).numFmt = excelFormat(metric.type);
  });
  summary.columns = [{ width: 34 }, { width: 28 }, { width: 12 }, { width: 12 }];
  summary.getCell('A19').value =
    'Read the accompanying Read me sheet for definitions, filters and limitations. Actuals, planning scenarios and attributed outcomes are not interchangeable.';
  summary.mergeCells('A19:D20');
  summary.getCell('A19').alignment = { wrapText: true, vertical: 'top' };
  summary.getCell('A19').font = { italic: true, color: { argb: 'FF716D7C' } };

  const sheet = workbook.addWorksheet('Report data', { views: [{ state: 'frozen', ySplit: 1, showGridLines: false }] });
  sheet.properties.tabColor = { argb: 'FFD9F99D' };
  sheet.columns = result.columns.map((column: any) => ({
    header: column.label,
    key: column.key,
    width: Math.min(38, Math.max(14, column.label.length + 2)),
  }));
  result.rows.forEach((item: any) =>
    sheet.addRow(Object.fromEntries(Object.entries(item).map(([key, value]) => [key, safe(value)]))),
  );
  const header = sheet.getRow(1);
  header.height = 30;
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF242033' } };
  header.alignment = { vertical: 'middle', wrapText: true };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: result.columns.length } };
  result.columns.forEach((column: any, index: number) => {
    sheet.getColumn(index + 1).numFmt = excelFormat(column.type);
  });
  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
    const row = sheet.getRow(rowIndex);
    row.alignment = { vertical: 'top', wrapText: false };
    if (rowIndex % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F5FA' } };
  }
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) row.border = { bottom: { style: 'hair', color: { argb: 'FFE6E2EB' } } };
  });

  const notes = workbook.addWorksheet('Read me', { views: [{ showGridLines: false }] });
  notes.properties.tabColor = { argb: 'FFF27D5B' };
  notes.columns = [{ width: 30 }, { width: 115 }];
  const noteRows: [string, any][] = [
    ['Report', result.definition.name],
    ['Evidence classification', result.definition.evidence],
    ['Generated (UTC)', result.generatedAt],
    [
      'Filters',
      JSON.stringify({
        from: result.options.from,
        to: result.options.to,
        studio: result.options.studio || null,
        status: result.options.status || null,
        dataMode: result.options.dataMode || null,
        scenario: result.options.scenario || null,
        search: result.options.search || null,
      }),
    ],
    ['Visible columns', result.columns.map((column: any) => column.label).join(' | ')],
    ['Row count', `${result.returnedRows} of ${result.totalRows}`],
    [
      'Sales coverage',
      `${result.provenance.salesCoverage.first} → ${result.provenance.salesCoverage.last}; ${result.provenance.salesCoverage.rows} rows`,
    ],
    ['Latest complete sales month', result.provenance.latestCompleteSalesMonth],
    ['Export policy', result.provenance.exportPolicy],
    ...result.definition.notes.map(
      (note: string, index: number) => [`Definition / limitation ${index + 1}`, note] as [string, string],
    ),
    ['External publishing', 'No Momence, WhatsApp, CRM or advertising-platform publication is claimed.'],
  ];
  noteRows.forEach(([label, value], index) => {
    const row = notes.getRow(index + 1);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true, color: { argb: 'FF4E40BD' } };
    row.getCell(2).value = safe(value);
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    row.alignment = { vertical: 'top' };
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}
