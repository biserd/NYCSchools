import XLSX from 'xlsx';
const path = process.argv[2];
const wb = XLSX.readFile(path);
console.log('Sheets:', wb.SheetNames);
for (const name of wb.SheetNames) {
  const sheet = wb.Sheets[name];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);
  console.log(`\n--- Sheet: ${name} (${rows.length} rows) ---`);
  if (rows.length > 0) {
    console.log('Headers:', Object.keys(rows[0]).slice(0, 30).join(' | '));
    console.log('Sample:', JSON.stringify(rows[0]).substring(0, 500));
    const yearKey = Object.keys(rows[0]).find(k => /year/i.test(k));
    if (yearKey) {
      const years = new Set(rows.map(r => r[yearKey]).filter(Boolean));
      console.log(`Years (${yearKey}):`, [...years].sort());
    }
  }
}
