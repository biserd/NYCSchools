interface SnapshotData {
  dbn: string;
  economicNeedIndex: number | null;
  attendanceRate: number | null;
  qualityRatingInstruction: string | null;
  qualityRatingSafety: string | null;
  qualityRatingFamily: string | null;
  principalName: string | null;
  website: string | null;
  phone: string | null;
  enrollment: number | null;
  elaProficiency: number | null;
  mathProficiency: number | null;
}

export async function fetchSnapshotData(dbn: string): Promise<SnapshotData | null> {
  const url = `https://tools.nycenet.edu/snapshot/2024/${dbn}/EMS/`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`Failed to fetch snapshot for ${dbn}: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    return {
      dbn,
      economicNeedIndex: extractEconomicNeedIndex(html),
      attendanceRate: extractAttendanceRate(html),
      qualityRatingInstruction: extractQualityRating(html, "Instruction and Performance"),
      qualityRatingSafety: extractQualityRating(html, "Safety and School Climate"),
      qualityRatingFamily: extractQualityRating(html, "Relationships with Families"),
      principalName: extractPrincipalName(html),
      website: extractWebsite(html),
      phone: extractPhone(html),
      enrollment: extractEnrollment(html),
      elaProficiency: extractELAProficiency(html),
      mathProficiency: extractMathProficiency(html),
    };
  } catch (error) {
    console.error(`Error fetching snapshot for ${dbn}:`, error);
    return null;
  }
}

function extractEconomicNeedIndex(html: string): number | null {
  const match = html.match(/Economic Need Index:\s*(\d+)%/i);
  return match ? parseInt(match[1]) : null;
}

function extractAttendanceRate(html: string): number | null {
  const match = html.match(/Student attendance:\s*(\d+)%/i);
  return match ? parseInt(match[1]) : null;
}

function extractQualityRating(html: string, category: string): string | null {
  const regex = new RegExp(`${category}[\\s\\S]*?Overall Rating[\\s\\S]*?(Excellent|Good|Fair|Needs Improvement)`, "i");
  const match = html.match(regex);
  return match ? match[1] : null;
}

function extractPrincipalName(html: string): string | null {
  const match = html.match(/Principal:\s*([^\n<]+)/i);
  return match ? match[1].trim() : null;
}

function extractWebsite(html: string): string | null {
  const match = html.match(/School website:\s*\[([^\]]+)\]/i);
  return match ? match[1].trim() : null;
}

function extractPhone(html: string): string | null {
  const match = html.match(/Phone:\s*([\d-]+)/i);
  return match ? match[1].trim() : null;
}

function extractEnrollment(html: string): number | null {
  const match = html.match(/Enrollment:\s*(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

function extractELAProficiency(html: string): number | null {
  const match = html.match(/(\d+)%[^<]*of students at this school met State standards on the State English test/i);
  return match ? parseInt(match[1]) : null;
}

function extractMathProficiency(html: string): number | null {
  const match = html.match(/(\d+)%[^<]*of students at this school met State standards on the State math test/i);
  return match ? parseInt(match[1]) : null;
}
