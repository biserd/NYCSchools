import XLSX from 'xlsx';
const path = process.argv[2];
const sheetName = process.argv[3];
const wb = XLSX.readFile(path);
const sheet = wb.Sheets[sheetName];
// Read raw rows to see the multi-header structure
const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any;
console.log(`Sheet ${sheetName}: ${rows.length} rows`);
for (let i = 0; i < Math.min(8, rows.length); i++) {
  console.log(`Row ${i} (${rows[i].length} cols): ${JSON.stringify(rows[i].slice(0, 30))}`);
}
