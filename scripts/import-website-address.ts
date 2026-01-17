import { db } from '../server/db';
import { schools } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';

interface HSRecord {
  dbn?: string;
  website?: string;
  location?: string;
}

interface MSRecord {
  schooldbn?: string;
  independentwebsite?: string;
  address?: string;
}

async function importWebsiteAddress() {
  console.log('Loading school directories...');
  
  const hsData: HSRecord[] = JSON.parse(readFileSync('./attached_assets/hs_directory.json', 'utf-8'));
  const msData: MSRecord[] = JSON.parse(readFileSync('./attached_assets/ms_directory.json', 'utf-8'));
  
  console.log(`HS records: ${hsData.length}, MS records: ${msData.length}`);
  
  const allDbSchools = await db.select({ dbn: schools.dbn, address: schools.address }).from(schools);
  const dbDbnSet = new Set(allDbSchools.map(s => s.dbn.toUpperCase()));
  console.log(`Schools in database: ${dbDbnSet.size}`);
  
  let updatedWebsite = 0;
  let updatedAddress = 0;
  
  for (const hs of hsData) {
    const dbn = hs.dbn?.trim().toUpperCase();
    if (!dbn || !dbDbnSet.has(dbn)) continue;
    
    let website = hs.website?.trim();
    if (website && !website.startsWith('http')) {
      website = 'https://' + website;
    }
    
    let fullAddress: string | null = null;
    if (hs.location) {
      const match = hs.location.match(/^(.+?)\s*\(\d+\.\d+/);
      if (match) {
        fullAddress = match[1].trim();
      } else {
        fullAddress = hs.location.split('(')[0].trim();
      }
    }
    
    const updates: { website?: string | null; address?: string } = {};
    if (website) updates.website = website;
    if (fullAddress) updates.address = fullAddress;
    
    if (Object.keys(updates).length > 0) {
      await db.update(schools).set(updates).where(eq(schools.dbn, dbn));
      if (website) updatedWebsite++;
      if (fullAddress) updatedAddress++;
    }
  }
  
  for (const ms of msData) {
    const dbn = ms.schooldbn?.trim().toUpperCase();
    if (!dbn || !dbDbnSet.has(dbn)) continue;
    
    let website = ms.independentwebsite?.trim();
    if (website && !website.startsWith('http')) {
      website = 'https://' + website;
    }
    
    const fullAddress = ms.address?.trim();
    
    const updates: { website?: string | null; address?: string } = {};
    if (website) updates.website = website;
    if (fullAddress) updates.address = fullAddress;
    
    if (Object.keys(updates).length > 0) {
      await db.update(schools).set(updates).where(eq(schools.dbn, dbn));
      if (website) updatedWebsite++;
      if (fullAddress) updatedAddress++;
    }
  }
  
  console.log(`\nImport complete:`);
  console.log(`- Updated website: ${updatedWebsite} schools`);
  console.log(`- Updated address: ${updatedAddress} schools`);
  
  const withWebsite = await db.select({ dbn: schools.dbn }).from(schools);
  const websiteCount = (await db.execute<{count: number}>`SELECT COUNT(*) as count FROM schools WHERE website IS NOT NULL`);
  console.log(`\nTotal schools with website: check database`);
}

importWebsiteAddress()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
