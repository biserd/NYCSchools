import { Link } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";

export default function MethodologyPage() {
  return <div className="min-h-screen bg-background flex flex-col"><SEOHead title="NYC School Ratings Methodology and Data Sources" description="See how NYC School Ratings calculates scores, which official data sources we use, when data is updated, and the limitations families should know." canonicalPath="/methodology" appendSiteName={false} /><AppHeader /><main className="flex-1 container mx-auto px-4 py-10 max-w-3xl prose dark:prose-invert">
    <h1>Rating methodology and data sources</h1>
    <p>NYC School Ratings helps families compare schools consistently. It is an independent guide, not an NYC Department of Education or New York State Education Department publication.</p>
    <h2>How the overall score is calculated</h2>
    <p>For schools with sufficient data, the overall score combines academics (40%), school climate (30%), and student progress (30%). High-school calculations use the age-appropriate outcomes shown on each school page. We withhold a numeric rating when required data is unavailable or state-test participation is too limited for a responsible comparison.</p>
    <h2>Primary sources</h2>
    <ul>
      <li><a href="https://data.ny.gov/browse?Dataset-Information_Agency=Education+Department%2C+State" rel="noopener noreferrer">New York State Education Department open data</a> for state assessment results.</li>
      <li><a href="https://infohub.nyced.org/reports/academics/test-results" rel="noopener noreferrer">NYC Public Schools InfoHub</a> for test results and school-level reports.</li>
      <li><a href="https://infohub.nyced.org/reports/school-quality" rel="noopener noreferrer">NYC School Quality Reports and Surveys</a> for climate, progress, and survey measures.</li>
      <li><a href="https://schoolsearch.schools.nyc/" rel="noopener noreferrer">NYC School Search</a> for official school and program information.</li>
    </ul>
    <h2>Data refresh: November 7, 2026</h2>
    <ul>
      <li>ELA and Math: spring 2026 tests, school year 2025–26, using the NYCPS snapshot as of August 3, 2026. The school files exclude charter schools and District 75; profiles absent from a release retain their earlier, explicitly dated results.</li>
      <li>Regents: NYCPS reporting years through 2026, including 2024 and 2025. The source year is shown directly. Pass rates mean scoring 65+; scoring 80+ is not the exam-specific CUNY readiness measure.</li>
      <li>Demographics and enrollment: <a href="https://infohub.nyced.org/docs/default-source/default-document-library/demographic-snapshot-2021-22-to-2025-26-public.xlsx">NYCPS Demographic Snapshot 2021–22 to 2025–26</a>. Current fields use 2025–26; the five source years appear separately in historical charts.</li>
    </ul>
    <p>Older records are preserved. ELA/Math standards changed in 2023, so the trend calculation compares complete ELA/Math results within the latest standards era. Science was not refreshed in this import and keeps its separate reporting year. Suppressed or unavailable results are not zero; source bounds such as “Above 95%” are retained as bounds in demographic history. Total enrollment can include early childhood grades that are outside the K–12 subtotals.</p>
    <h2>Freshness, interpretation, and corrections</h2>
    <p>Each school page displays the reporting year where supplied and its latest database update. Different measures may come from different reporting cycles. A rating is a starting point—not a substitute for visiting a school, reviewing current admissions rules, and considering your child’s needs.</p>
    <p>Program availability, zones, and admissions rules can change. Always verify those details with NYC Public Schools. To report a data issue, email <a href="mailto:hello@nycschoolsratings.com">hello@nycschoolsratings.com</a>.</p>
    <p><Link href="/about">About the project</Link></p>
  </main><Footer /></div>;
}
