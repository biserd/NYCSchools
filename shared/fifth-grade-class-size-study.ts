export const FIFTH_GRADE_POST = {
  slug: 'nyc-fifth-grade-class-size-test-scores',
  title: 'Why Bigger Fifth-Grade Classes Looked Better in NYC’s Test Data',
  seoTitle: 'NYC Fifth-Grade Class Size vs. Test Scores (2026)',
  description: 'A comparison of class sizes and 2026 science, ELA, and math scores at 680 NYC schools shows why larger classes looked better before adjustment.',
  author: 'NYC School Ratings Team', publishedAt: '2026-11-20', readTime: '7 min read', category: 'Data Analysis',
  featuredImage: '/blog/nyc-fifth-grade-class-size-test-scores/nyc-fifth-grade-class-size-science.png',
  featureAlt: 'NYC fifth-grade science proficiency averaged 38.3% at schools with classes under 20 students and 47.1% at schools averaging 24 or more.',
  tags: ['NYC class size', 'Grade 5', 'NYSED test results', 'Science', 'ELA', 'Math', '2026'],
};
export const FIFTH_GRADE_URL = `/blog/${FIFTH_GRADE_POST.slug}`;
export const CLASS_SIZE_WORKBOOK = 'https://infohub.nyced.org/docs/default-source/default-document-library/february-2025-26-class-size---school.xlsx';
export const NYSED_GRADE5_ARCHIVE = 'https://data.nysed.gov/files/essa/25-26/SRC2026.zip';

export const studySubjects = ['Science', 'ELA', 'Math'] as const;
export type GradeFiveSubject = (typeof studySubjects)[number];
export const gradeFiveStudy = {
  eligibleSchools: 773, springResultSchools: 767, pairedSchools: 762, modelSchools: 680, districts: 32,
  bands: [
    {label:'Under 20', schools:213, avgSize:17.20, rates:{Science:38.27, ELA:43.94, Math:54.45}},
    {label:'20 to under 24', schools:245, avgSize:21.90, rates:{Science:41.51, ELA:45.67, Math:54.66}},
    {label:'24 or more', schools:222, avgSize:27.32, rates:{Science:47.07, ELA:50.80, Math:61.00}},
  ],
  estimates: {
    Science:{prior:4.73, current:4.72, adjusted:0.57, low:-0.52, high:1.66},
    ELA:{prior:4.04, current:3.69, adjusted:0.22, low:-0.89, high:1.34},
    Math:{prior:5.46, current:3.99, adjusted:-0.18, low:-1.68, high:1.33},
  },
} as const;

export const signedPoint=(n:number)=>`${n<0?'−':n>0?'+':''}${Math.abs(n).toFixed(1)}`;
