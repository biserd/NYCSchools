// Search presentation is shared by the initial HTML and the interactive pages.
export const MAP_META = {
  title: 'NYC School District Map: Find Schools by District & Grade',
  description: 'Explore NYC schools on an interactive district map. Filter by district, grade and program, open profiles, and check attendance zones with the official address lookup.',
  heading: 'NYC School District Map',
};
export const PRIVATE_DIRECTORY_META = {
  title: 'NYC Private Schools: Browse by Borough & Grade',
  description: 'Find NYC private schools by borough and grade. Compare recorded enrollment, affiliations and source years, then verify current tuition and admissions with each school.',
  heading: 'NYC Private Schools by Borough and Grade',
};
export const PRIVATE_BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'] as const;
export const PRIVATE_GRADES = [
  { value: 'elementary', label: 'Elementary (K–5)' },
  { value: 'middle', label: 'Middle (6–8)' },
  { value: 'high', label: 'High school (9–12)' },
] as const;

export function privateDirectoryPath(borough = 'all', grade = 'all') {
  const params = new URLSearchParams();
  if (PRIVATE_BOROUGHS.some(b => b === borough)) params.set('borough', borough);
  if (PRIVATE_GRADES.some(g => g.value === grade)) params.set('grade', grade);
  return `/private-schools${params.size ? `?${params}` : ''}#school-results`;
}
