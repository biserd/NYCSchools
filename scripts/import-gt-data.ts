import { db } from "../server/db";
import { schools } from "../shared/schema";
import { eq } from "drizzle-orm";

const CITYWIDE_GT_SCHOOLS = [
  "01M539", // NEST+M (New Explorations into Science, Technology and Math)
  "03M334", // The Anderson School
  "04M012", // TAG Young Scholars
  "20K686", // Brooklyn School of Inquiry
  "30Q300", // The 30th Avenue School (PS/IS 300)
];

const DISTRICT_GT_SCHOOLS_K = [
  "01M015", // P.S. 015 Roberto Clemente
  "01M110", // P.S. 110 Florence Nightingale
  "02M011", // P.S. 011 William T. Harris
  "02M003", // P.S. 033 Chelsea Prep (listed as 02M003)
  "02M033", // P.S. 033 Chelsea Prep (alternative DBN)
  "02M077", // P.S. 77 Lower Lab School
  "02M111", // P.S. 111 Adolph S. Ochs
  "02M124", // P.S. 125 Yung Wing (listed as 02M124)
  "02M125", // P.S. 125 Yung Wing (alternative DBN)
  "02M130", // P.S. 130 Hernando De Soto
  "02M198", // P.S. 198 Isador E. Ida Straus
  "02M217", // P.S./I.S. 217 Roosevelt Island
  "03M165", // P.S. 165 Robert E. Simon
  "03M166", // P.S. 166 The Richard Rodgers School
  "04M102", // P.S. 102 Jacques Cartier
  "05M128", // P.S. 129 John H. Finley (listed as 05M128)
  "05M129", // P.S. 129 John H. Finley (alternative DBN)
  "05M175", // P.S. 175 Henry H Garnet
  "06M153", // P.S. 153 Adam Clayton Powell
  "07X049", // P.S. 049 Willis Avenue (listed as 07X49)
  "08X072", // P.S. 072 Dr. William Dorney
  "09X199", // P.S. 199X – The Shakespeare School
  "10X007", // Milton Fein School
  "10X024", // P.S. 024 Spuyten Duyvil
  "11X121", // P.S. 121 Throop
  "11X153", // P.S. 153 Helen Keller
  "12X458", // Samara Community School
  "13K056", // P.S. 056 Lewis H. Latimer
  "13K282", // P.S. 282 Park Slope
  "14K132", // P.S. 132 The Conselyea School
  "15K032", // P.S. 032 Samuel Mills Sprole
  "15K038", // P.S. 038 The Pacific
  "16K081", // P.S. 081 Thaddeus Stevens
  "16K243", // P.S. 243K- The Weeksville School
  "17K316", // P.S. 316 Elijah Stroud
  "18K115", // P.S. 115 Daniel Mucatel School
  "19K149", // P.S. 149 Danny Kaye
  "20K102", // P.S. 102 The Bayview
  "20K104", // P.S./I.S. 104 The Fort Hamilton School
  "20K164", // P.S. 164 Caesar Rodney
  "20K200", // P.S. 200 Benson School
  "20K205", // P.S. 205 Clarion
  "20K229", // P.S. 229 Dyker
  "21K095", // P.S. 095 The Gravesend
  "21K099", // P.S. 099 Isaac Asimov
  "21K215", // P.S. 215 Morris H. Weiss
  "22K052", // P.S. 052 Sheepshead Bay
  "22K193", // P.S. 193 Gil Hodges
  "22K195", // P.S. 195 Manhattan Beach
  "22K197", // P.S. 197 - The Kings Highway Academy
  "22K236", // P.S. 236 Mill Basin
  "23K137", // P.S./I.S. 137 Rachel Jean Mitchell
  "24Q119", // P.S./I.S. 119 The Glendale
  "24Q153", // P.S. 153 Maspeth Elem
  "24Q229", // P.S. 229 Emanuel Kaplan
  "24Q290", // A.C.E. Academy for Scholars
  "25Q021", // P.S. 021 Edward Hart
  "25Q032", // P.S. 032 State Street
  "25Q079", // P.S. 079 Francis Lewis
  "25Q165", // P.S. 165 Edith K. Bergtraum
  "25Q209", // P.S. 209 Clearview Gardens
  "26Q115", // The James J. Ambrose School
  "26Q133", // P.S. 133 Queens
  "26Q188", // P.S. 188 Kingsbury
  "26Q203", // P.S. 203 Oakland Gardens
  "27Q108", // P.S. 108 Captain Vincent G. Fowler
  "27Q042", // P.S./M.S. 042 R. Vernam
  "28Q121", // P.S. 121 Queens
  "28Q174", // P.S. 174 William Sidney Mount
  "28Q220", // P.S. 220 Edward Mandel
  "29Q176", // P.S. 176 Cambria Heights
  "29Q118", // P.S. 118 Lorraine Hansberry
  "30Q085", // P.S. 085 Judge Charles Vallone
  "30Q122", // P.S. 122 Mamie Fay
  "30Q150", // P.S. 150 Queens
  "30Q166", // P.S. 166 Henry Gradstein
  "31R003", // P.S. 003 The Margaret Gioiosa School
  "31R008", // P.S. 8 Shirlee Solomon
  "31R042", // P.S. 042 Eltingville
  "31R045", // P.S. 045 John Tyler
  "31R050", // P.S. 050 Frank Hankinson
  "31R053", // The Barbara Esselborn School
  "32K376", // P.S. 376
];

const DISTRICT_GT_SCHOOLS_3RD_GRADE = [
  "01M034", // P.S. 034 Franklin D. Roosevelt
  "02M126", // P.S. 126 Jacob August Riis
  "03M191", // The Riverside School for Makers and Artists
  "04M083", // P.S. 083 Luis Munoz Rivera
  "05M161", // P.S. 161 Pedro Albizu Campo
  "06M028", // P.S. 028 Wright Brothers
  "07X043", // P.S. 043 Jonas Bronck
  "07X359", // Concourse Village Elementary School
  "08X075", // P.S. 75 School of Research and Discovery
  "09X204", // P.S. 204 Morris Heights
  "10X340", // P.S. 340
  "11X106", // P.S. 106 Parkchester
  "12X314", // Fairmont Neighborhood School
  "12X214", // P.S. 214
  "13K287", // P.S. 287 Bailey K. Ashford
  "14K084", // P.S. 084 Jose De Diego
  "15K024", // P.S. 024
  "16K021", // P.S. 021 Crispus Attucks
  "17K289", // P.S. 289 George V. Brower
  "17K241", // P.S. 241 Emma L. Johnston
  "18K235", // P.S. 235 Janice Marie Knight School
  "19K065", // P.S. 065
  "19K346", // P.S. 346 Abe Stark
  "20K127", // P.S. 127 Mckinley Park
  "21K188", // P.S. 188 Michael E. Berdy
  "22K203", // P.S. 203 Floyd Bennett School
  "22K361", // P.S. 361 East Flatbush Early Childhood School
  "23K599", // Brooklyn Landmark Elementary School
  "23K446", // Riverdale Avenue Community School
  "24Q088", // P.S. 088 Seneca
  "24Q007", // P.S. 007 Louis F. Simeone
  "24Q087", // P.S./I.S. 087 Middle Village
  "25Q024", // P.S. 024 Andrew Jackson
  "26Q376", // P.S. 376
  "27Q056", // P.S. 056 Harry Eichler
  "27Q183", // P.S. 183 Dr. Richard R. Green
  "28Q086", // P.S. Q086
  "28Q140", // P.S. 140 Edward K Ellington
  "29Q251", // P.S. 251 Queens
  "30Q092", // P.S. 092 Harry T. Stewart Sr.
  "30Q151", // P.S. 151 Mary D. Carter
  "30Q171", // P.S. 171 Peter G. Van Alst
  "31R022", // P.S. 022 Graniteville
  "32K274", // P.S. 274 Kosciusko
];

async function importGiftedTalentedData() {
  console.log("=== Importing Gifted & Talented Program Data ===\n");

  console.log("1. Fetching schools from database...");
  const allSchools = await db.select({ dbn: schools.dbn, name: schools.name }).from(schools);
  console.log(`   Total schools in database: ${allSchools.length}`);

  console.log("\n2. Resetting all G&T flags to false...");
  await db.update(schools).set({ has_gifted_talented: false, gt_program_type: null });
  console.log("   Reset complete.");

  const schoolDbns = new Set(allSchools.map(s => s.dbn.toUpperCase()));

  console.log("\n3. Updating Citywide G&T Schools...");
  let citywideUpdated = 0;
  for (const dbn of CITYWIDE_GT_SCHOOLS) {
    const normalizedDbn = dbn.toUpperCase();
    if (schoolDbns.has(normalizedDbn)) {
      await db.update(schools)
        .set({ has_gifted_talented: true, gt_program_type: "citywide" })
        .where(eq(schools.dbn, normalizedDbn));
      citywideUpdated++;
      const school = allSchools.find(s => s.dbn.toUpperCase() === normalizedDbn);
      console.log(`   ✓ ${normalizedDbn} | ${school?.name?.slice(0, 40)}`);
    } else {
      console.log(`   ✗ ${normalizedDbn} not found in database`);
    }
  }
  console.log(`   Citywide schools updated: ${citywideUpdated}`);

  console.log("\n4. Updating District G&T Schools (K entry)...");
  let districtKUpdated = 0;
  for (const dbn of DISTRICT_GT_SCHOOLS_K) {
    const normalizedDbn = dbn.toUpperCase();
    if (schoolDbns.has(normalizedDbn)) {
      await db.update(schools)
        .set({ has_gifted_talented: true, gt_program_type: "district" })
        .where(eq(schools.dbn, normalizedDbn));
      districtKUpdated++;
    }
  }
  console.log(`   District K-entry schools updated: ${districtKUpdated}`);

  console.log("\n5. Updating District G&T Schools (3rd Grade entry)...");
  let district3rdUpdated = 0;
  for (const dbn of DISTRICT_GT_SCHOOLS_3RD_GRADE) {
    const normalizedDbn = dbn.toUpperCase();
    if (schoolDbns.has(normalizedDbn)) {
      const existing = await db.select().from(schools).where(eq(schools.dbn, normalizedDbn));
      if (existing[0] && !existing[0].has_gifted_talented) {
        await db.update(schools)
          .set({ has_gifted_talented: true, gt_program_type: "district" })
          .where(eq(schools.dbn, normalizedDbn));
        district3rdUpdated++;
      }
    }
  }
  console.log(`   District 3rd-grade entry schools updated: ${district3rdUpdated}`);

  const totalGT = await db.select().from(schools).where(eq(schools.has_gifted_talented, true));
  const citywideCount = totalGT.filter(s => s.gt_program_type === "citywide").length;
  const districtCount = totalGT.filter(s => s.gt_program_type === "district").length;

  console.log(`\n✅ Import complete!`);
  console.log(`   Total schools with G&T programs: ${totalGT.length}`);
  console.log(`   - Citywide G&T: ${citywideCount}`);
  console.log(`   - District G&T: ${districtCount}`);

  console.log("\n6. Sample G&T schools:");
  const sampleSchools = await db
    .select()
    .from(schools)
    .where(eq(schools.has_gifted_talented, true))
    .limit(10);

  sampleSchools.forEach((school) => {
    console.log(`   ${school.dbn} | ${school.name?.slice(0, 35)} | ${school.gt_program_type}`);
  });

  console.log("\n7. G&T schools by district:");
  const byDistrict: Record<number, number> = {};
  totalGT.forEach((school) => {
    byDistrict[school.district] = (byDistrict[school.district] || 0) + 1;
  });
  Object.keys(byDistrict)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach((district) => {
      console.log(`   District ${district}: ${byDistrict[parseInt(district)]} schools`);
    });

  console.log("\n✨ Gifted & Talented data import finished!");
  process.exit(0);
}

importGiftedTalentedData().catch((err) => {
  console.error("Error importing G&T data:", err);
  process.exit(1);
});
