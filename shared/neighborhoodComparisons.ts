export interface NeighborhoodComparison {
  zipCode: string;
  neighborhood: string;
  schools: Array<{
    dbn: string;
    name: string;
  }>;
}

export const neighborhoodComparisons: NeighborhoodComparison[] = [
  {
    zipCode: "10002",
    neighborhood: "Lower East Side",
    schools: [
      { dbn: "01M188", name: "P.S. 188 The Island School" },
      { dbn: "02M042", name: "P.S. 042 Benjamin Altman" },
    ],
  },
  {
    zipCode: "10009",
    neighborhood: "East Village",
    schools: [
      { dbn: "01M064", name: "P.S. 064 Robert Simon" },
      { dbn: "01M015", name: "P.S. 015 Roberto Clemente" },
    ],
  },
  {
    zipCode: "10011",
    neighborhood: "Chelsea",
    schools: [
      { dbn: "02M011", name: "P.S. 011: The Sarah J. Garnet Elementary School" },
      { dbn: "02M041", name: "P.S. 041 Greenwich Village" },
    ],
  },
  {
    zipCode: "10023",
    neighborhood: "Upper West Side (Lincoln Square)",
    schools: [
      { dbn: "03M199", name: "P.S. 199 Jessie Isador Straus" },
      { dbn: "03M452", name: "P.S. 452" },
    ],
  },
  {
    zipCode: "10024",
    neighborhood: "Upper West Side",
    schools: [
      { dbn: "03M009", name: "P.S. 009 Sarah Anderson" },
      { dbn: "03M087", name: "P.S. 087 William Sherman" },
    ],
  },
  {
    zipCode: "10025",
    neighborhood: "Manhattan Valley",
    schools: [
      { dbn: "03M084", name: "P.S. 084 Lillian Weber" },
      { dbn: "03M165", name: "P.S. 165 Robert E. Simon" },
    ],
  },
  {
    zipCode: "10028",
    neighborhood: "Upper East Side",
    schools: [
      { dbn: "02M006", name: "P.S. 006 Lillie D. Blake" },
      { dbn: "02M290", name: "P.S. 290 Manhattan New School" },
    ],
  },
  {
    zipCode: "10128",
    neighborhood: "Upper East Side (Yorkville)",
    schools: [
      { dbn: "02M198", name: "P.S. 198 Isador E. Ida Straus" },
      { dbn: "02M527", name: "P.S. 527 East Side School for Social Action" },
    ],
  },
  {
    zipCode: "10032",
    neighborhood: "Washington Heights",
    schools: [
      { dbn: "06M008", name: "P.S. 008 Luis Belliard" },
      { dbn: "06M028", name: "P.S. 028 Wright Brothers" },
    ],
  },
  {
    zipCode: "10034",
    neighborhood: "Inwood",
    schools: [
      { dbn: "06M018", name: "P.S. 018 Park Terrace" },
      { dbn: "06M098", name: "P.S. 098 Shorac Kappock" },
    ],
  },
  {
    zipCode: "10040",
    neighborhood: "Fort George",
    schools: [
      { dbn: "06M152", name: "P.S. 152 Dyckman Valley" },
      { dbn: "06M189", name: "P.S. 189" },
    ],
  },
  {
    zipCode: "10029",
    neighborhood: "East Harlem",
    schools: [
      { dbn: "04M146", name: "P.S. 146 Ann M. Short" },
      { dbn: "04M038", name: "P.S. 38 Roberto Clemente" },
    ],
  },
  {
    zipCode: "10027",
    neighborhood: "Central Harlem",
    schools: [
      { dbn: "05M154", name: "P.S. 154 Harriet Tubman" },
      { dbn: "03M242", name: "P.S. 242 The Young Diplomats Magnet Academy" },
    ],
  },
  {
    zipCode: "10301",
    neighborhood: "Staten Island (St. George)",
    schools: [
      { dbn: "31R016", name: "P.S. 016 John J. Driscoll" },
      { dbn: "31R074", name: "P.S. 74 Future Leaders Elementary School" },
    ],
  },
  {
    zipCode: "10306",
    neighborhood: "Staten Island (New Dorp)",
    schools: [
      { dbn: "31R023", name: "P.S. 023 Richmondtown" },
      { dbn: "31R050", name: "P.S. 050 Frank Hankinson" },
    ],
  },
  {
    zipCode: "11201",
    neighborhood: "Brooklyn Heights/DUMBO",
    schools: [
      { dbn: "13K029", name: "P.S. 029 John M. Harrigan" },
      { dbn: "13K307", name: "P.S. 307 Daniel Hale Williams" },
    ],
  },
  {
    zipCode: "11215",
    neighborhood: "Park Slope",
    schools: [
      { dbn: "15K321", name: "P.S. 321 William Penn" },
      { dbn: "15K124", name: "P.S. 124 Silas B. Dutcher" },
    ],
  },
  {
    zipCode: "11217",
    neighborhood: "Boerum Hill/Gowanus",
    schools: [
      { dbn: "15K261", name: "P.S. 261 Zipporiah Mills" },
      { dbn: "15K038", name: "P.S. 038 The Pacific" },
    ],
  },
  {
    zipCode: "11221",
    neighborhood: "Bushwick",
    schools: [
      { dbn: "32K044", name: "P.S. 044 Marcus Garvey" },
      { dbn: "32K026", name: "P.S. 026 Jesse Owens" },
    ],
  },
  {
    zipCode: "11385",
    neighborhood: "Ridgewood",
    schools: [
      { dbn: "24Q081", name: "P.S. 81Q Jean Paul Richter" },
      { dbn: "24Q071", name: "P.S. 071 Forest" },
    ],
  },
  {
    zipCode: "10456",
    neighborhood: "Morrisania (Bronx)",
    schools: [
      { dbn: "07X088", name: "P.S. X088 S. Silverstein Little Sparrow School" },
      { dbn: "07X157", name: "P.S. 157 Grove Hill" },
    ],
  },
  {
    zipCode: "10457",
    neighborhood: "Tremont (Bronx)",
    schools: [
      { dbn: "09X070", name: "P.S. 070 Max Schoenfeld" },
      { dbn: "09X009", name: "P.S. 9 Ryer Avenue Elementary School" },
    ],
  },
  {
    zipCode: "10467",
    neighborhood: "Norwood (Bronx)",
    schools: [
      { dbn: "10X056", name: "P.S. 056 Norwood Heights" },
      { dbn: "10X094", name: "P.S. 094 Kings College School" },
    ],
  },
  {
    zipCode: "11354",
    neighborhood: "Flushing",
    schools: [
      { dbn: "25Q020", name: "P.S. 020 John Bowne" },
      { dbn: "25Q021", name: "P.S. 021 Edward Hart" },
    ],
  },
  {
    zipCode: "11435",
    neighborhood: "Jamaica",
    schools: [
      { dbn: "28Q040", name: "P.S. 040 Samuel Huntington" },
      { dbn: "28Q139", name: "P.S. 139 Rego Park" },
    ],
  },
];

export function getComparisonSlugForNeighborhood(comparison: NeighborhoodComparison): string {
  return comparison.schools.map(s => {
    const dbn = s.dbn.toUpperCase();
    const borough = dbn.charAt(2);
    const schoolNumber = dbn.slice(3);
    const nameMatch = s.name.match(/^(P\.?S\.?|I\.?S\.?|M\.?S\.?)/i);
    const type = nameMatch ? nameMatch[1].replace(/\./g, '').toUpperCase() : 'PS';
    return `${type}${schoolNumber}-${borough}`;
  }).join('-vs-');
}
