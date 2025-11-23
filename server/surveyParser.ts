import fs from "fs";
import path from "path";

interface SurveyData {
  dbn: string;
  studentSafety: number | null;
  studentTeacherTrust: number | null;
  studentEngagement: number | null;
  teacherQuality: number | null;
  teacherCollaboration: number | null;
  teacherLeadership: number | null;
  guardianSatisfaction: number | null;
  guardianCommunication: number | null;
  guardianSchoolTrust: number | null;
}

export async function parseSurveyCSV(filePath: string): Promise<Map<string, SurveyData>> {
  const surveyData = new Map<string, SurveyData>();
  
  const csvContent = fs.readFileSync(filePath, "utf-8");
  const lines = csvContent.split("\n");
  
  if (lines.length < 3) {
    throw new Error("CSV file is too short");
  }
  
  const headerLine = lines[1];
  const headers = parseCSVLine(headerLine);
  
  const columnIndices = {
    name: 0,
    studentSafety: headers.indexOf("Safety"),
    studentTeacherTrust: headers.indexOf("Student-Teacher Trust"),
    studentEngagement: headers.indexOf("Skills For Success"),
    teacherQuality: headers.indexOf("Strong Core Instruction"),
    teacherCollaboration: headers.indexOf("Peer Collaboration"),
    teacherLeadership: headers.indexOf("Instructional Leadership"),
    guardianSatisfaction: headers.lastIndexOf("Family Satisfaction with Child's Education"),
    guardianCommunication: headers.lastIndexOf("Outreach to Parents"),
    guardianSchoolTrust: headers.lastIndexOf("Parent-Principal Trust"),
  };
  
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    const nameField = values[0];
    if (!nameField) continue;
    
    const dbnMatch = nameField.match(/^([0-9]{2}[A-Z][0-9]{3})/);
    if (!dbnMatch) continue;
    
    const dbn = dbnMatch[1];
    
    surveyData.set(dbn, {
      dbn,
      studentSafety: parseScore(values[columnIndices.studentSafety]),
      studentTeacherTrust: parseScore(values[columnIndices.studentTeacherTrust]),
      studentEngagement: parseScore(values[columnIndices.studentEngagement]),
      teacherQuality: parseScore(values[columnIndices.teacherQuality]),
      teacherCollaboration: parseScore(values[columnIndices.teacherCollaboration]),
      teacherLeadership: parseScore(values[columnIndices.teacherLeadership]),
      guardianSatisfaction: parseScore(values[columnIndices.guardianSatisfaction]),
      guardianCommunication: parseScore(values[columnIndices.guardianCommunication]),
      guardianSchoolTrust: parseScore(values[columnIndices.guardianSchoolTrust]),
    });
  }
  
  return surveyData;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

function parseScore(value: string | undefined): number | null {
  if (!value || value === "" || value === "N/A") {
    return null;
  }
  const num = parseFloat(value);
  return isNaN(num) ? null : Math.round(num);
}
