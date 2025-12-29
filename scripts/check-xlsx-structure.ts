import * as XLSX from 'xlsx';

async function checkStructure() {
  const url = 'https://infohub.nyced.org/docs/default-source/default-document-library/ose/fall-2025-admissions_72_suppressed.xlsx';
  console.log('Downloading...');
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  const sheet = workbook.Sheets['School'];
  const data = XLSX.utils.sheet_to_json(sheet, { raw: false });
  
  console.log('\nColumn headers:');
  const headers = Object.keys(data[0] as object);
  headers.forEach((h, i) => console.log(`  ${i}: ${h}`));
  
  console.log('\nSample row (first "All Students" row):');
  const sampleRow = data.find((r: any) => r['Category'] === 'All Students') as any;
  if (sampleRow) {
    Object.entries(sampleRow).slice(0, 30).forEach(([k, v]) => {
      console.log(`  ${k}: ${v}`);
    });
  }
}

checkStructure();
