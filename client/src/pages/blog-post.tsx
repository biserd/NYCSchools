import { useParams, Link } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData } from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getBlogPost } from "@shared/blog-data";
import { Calendar, Clock, ArrowLeft, Share2, TrendingUp, AlertTriangle, CheckCircle, Home, Lightbulb, ChevronRight } from "lucide-react";
import {
  DistrictPerformanceChart,
  ProficiencyTierChart,
  EconomicImpactChart,
  GTComparisonChart,
  KeyStatsCards,
  CovidRecoveryStatsCards,
  CitywideRecoveryTrendChart,
  DistrictRecoveryChart,
  TopImprovedSchoolsTable,
  AdmissionsStatsCards,
  DemandByGradeChart,
  CompetitivenessDistributionChart,
  BoroughDemandChart,
  DemandTrendChart,
  TopCompetitiveSchoolsTable,
} from "@/components/blog/DataCharts";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function CovidRecoveryPost() {
  return (
    <article className="prose prose-lg dark:prose-invert max-w-none">
      <p className="lead text-xl text-muted-foreground">
        After analyzing <strong>the latest 2025 NYSED test scores</strong> for over 1,000 NYC schools, we have some encouraging news:
        NYC students have not only recovered from COVID-era learning loss but have <strong>surpassed pre-pandemic proficiency levels</strong>.
        Here's what the data tells us about one of the most remarkable educational recoveries in recent history.
      </p>

      <CovidRecoveryStatsCards />

      <h2 id="the-covid-impact">The COVID Impact: What Happened in 2020-2021</h2>
      
      <p>
        When schools closed in March 2020, NYC faced an unprecedented challenge. The 2019-2020 and 2020-2021 school years saw
        state testing suspended entirely, leaving a gap in our data. When testing resumed in 2022, the results were sobering:
      </p>

      <ul>
        <li><strong>ELA proficiency held relatively steady</strong> at 46.2% (2019) to 45.2% (2022) - a modest 1.0 percentage point decline</li>
        <li><strong>Math took the harder hit</strong>, falling from 44.4% (2019) to 36.2% (2022) - a significant 8.2 percentage point decline</li>
        <li>The math drop was <strong>eight times as severe</strong> as ELA, confirming national research that math suffered more from remote learning</li>
      </ul>

      <Card className="my-6 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-1" />
            <div>
              <strong className="text-red-700 dark:text-red-400">Why Math Suffered More</strong>
              <p className="text-sm text-red-600/80 dark:text-red-300/80 mt-1 mb-0">
                Research suggests math requires more structured, teacher-led instruction that was harder to replicate remotely.
                Concepts build sequentially, so gaps in one year compound in subsequent years. ELA skills like reading
                are more easily practiced independently at home.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <CitywideRecoveryTrendChart />

      <h2 id="the-recovery">The Recovery: 2022-2025</h2>

      <p>
        What happened next is a testament to NYC's teachers, students, and families. In just three years, the city didn't just
        recover - it <strong>exceeded pre-pandemic performance</strong>:
      </p>

      <ul>
        <li><strong>2025 ELA: 54.9%</strong> - up 9.7 points from 2022 and 8.7 points above 2019</li>
        <li><strong>2025 Math: 55.0%</strong> - up 18.8 points from 2022 and 10.6 points above 2019</li>
        <li>Math's recovery was <strong>more than twice its decline</strong>, suggesting targeted interventions worked</li>
      </ul>

      <Card className="my-6 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
            <div>
              <strong className="text-emerald-700 dark:text-emerald-400">A Historic Achievement</strong>
              <p className="text-sm text-emerald-600/80 dark:text-emerald-300/80 mt-1 mb-0">
                For the first time, more than half of NYC students are proficient in both ELA and Math.
                This represents years of targeted intervention, summer programs, tutoring initiatives, and 
                the dedicated work of educators across the city.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="district-recovery">Which Districts Recovered Fastest?</h2>

      <p>
        Not all districts recovered at the same pace. Some communities that were hit hardest by COVID showed
        the most dramatic improvements, suggesting that targeted resources made a real difference:
      </p>

      <DistrictRecoveryChart />

      <p>
        <strong>District 23 (Brownsville, Brooklyn)</strong> leads the city with a combined 25.8 percentage point improvement
        in average proficiency from 2022 to 2025. This is followed by District 16 (Bedford-Stuyvesant) and District 18 (Canarsie),
        both historically underserved communities that received significant recovery resources.
      </p>

      <Card className="my-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Lightbulb className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
            <div>
              <strong className="text-blue-700 dark:text-blue-400">What This Means for Parents</strong>
              <p className="text-sm text-blue-600/80 dark:text-blue-300/80 mt-1 mb-0">
                If you're looking at schools in these high-recovery districts, check their individual trends.
                Many schools that struggled in 2022 are now among the city's most improved. Past performance
                during COVID may not reflect a school's current trajectory.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="top-schools">Top Improved Schools</h2>

      <p>
        Some individual schools showed remarkable turnarounds. The top improvers increased their combined ELA and Math
        proficiency by 100+ percentage points in just three years:
      </p>

      <TopImprovedSchoolsTable />

      <p>
        <em>Note: We filtered to schools with at least 20% proficiency in 2022 to focus on genuine improvement
        rather than statistical anomalies from very small numbers.</em>
      </p>

      <h2 id="what-it-means">What This Means for Your School Search</h2>

      <Card className="my-6 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <TrendingUp className="w-6 h-6 text-primary shrink-0 mt-1" />
            <div>
              <strong className="text-foreground">Key Takeaways for Parents</strong>
              <ul className="text-sm text-muted-foreground mt-2 mb-0 space-y-2">
                <li><strong>Look at trends, not just current scores</strong> - A school that's improved 20 points may be better than one that's declined 5 points, even if the latter has a higher current score.</li>
                <li><strong>Don't judge schools by 2022 data</strong> - The COVID low point doesn't reflect where schools are today.</li>
                <li><strong>High-recovery districts may offer hidden gems</strong> - Schools in Districts 23, 16, and 18 have shown they can improve dramatically.</li>
                <li><strong>Math programs matter</strong> - Schools that recovered strongly in math likely have effective intervention programs.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="methodology">Methodology</h2>

      <p>
        This analysis uses official NYSED State Report Card data (SRC2025 release, December 2024). We analyzed
        ELA and Math proficiency rates for NYC schools from 2018-2025, excluding the COVID gap years of 2020-2021
        when state testing was suspended. All percentages represent the proportion of students meeting or exceeding
        proficiency standards on New York State assessments.
      </p>

      <p>
        <Link href="/" className="text-primary hover:underline">
          Explore individual school data and trends in our school browser
        </Link>
        , where you can see historical performance for every NYC public school.
      </p>
    </article>
  );
}

function DOEDataAnalysisPost() {
  return (
    <article className="prose prose-lg dark:prose-invert max-w-none">
      <p className="lead text-xl text-muted-foreground">
        We analyzed data from <strong>1,533 NYC public and charter schools</strong> to understand the current state of education quality. 
        Our findings reveal significant disparities across districts, a clear correlation between economic factors and academic performance, 
        and some surprising insights that every parent should know.
      </p>

      <KeyStatsCards />

      <h2 id="overview">The Big Picture: Academic Performance Across NYC</h2>
      
      <p>
        Looking at the 2023-24 school year data, the average NYC school has an <strong>ELA (English Language Arts) proficiency rate of 53.2%</strong> and 
        a <strong>Math proficiency rate of 52.7%</strong>. This means that roughly half of students are meeting or exceeding grade-level standards.
      </p>

      <p>
        However, these citywide averages mask enormous variation between schools. When we break down schools by proficiency level, the distribution is concerning:
      </p>

      <ProficiencyTierChart />

      <Card className="my-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Key Finding</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-0">
                Only <strong>8.5% of NYC schools</strong> (130 out of 1,533) have high ELA proficiency rates above 80%. 
                Meanwhile, <strong>52% of schools</strong> fall in the "low" category with proficiency between 40-59%.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="district-disparities">The District Divide: 30+ Point Gaps</h2>

      <p>
        One of the most striking findings is the vast performance gap between districts. The top-performing district, 
        <strong>District 26 in Queens (Bayside/Little Neck)</strong>, has an average ELA proficiency of 70.4%. 
        Meanwhile, <strong>District 9 in the Bronx</strong> averages just 41.8% — a gap of nearly 30 percentage points.
      </p>

      <DistrictPerformanceChart />

      <h3>Top Performing Districts</h3>
      <ul>
        <li><strong>District 26 (Queens):</strong> 70.4% ELA, 73.1% Math — Bayside, Douglaston, Little Neck</li>
        <li><strong>District 20 (Brooklyn):</strong> 64.6% ELA, 68.0% Math — Bay Ridge, Bensonhurst, Bath Beach</li>
        <li><strong>District 25 (Queens):</strong> 62.4% ELA, 64.6% Math — Flushing, College Point, Whitestone</li>
        <li><strong>District 2 (Manhattan):</strong> 60.9% ELA, 60.1% Math — Tribeca, Chelsea, Upper East Side</li>
      </ul>

      <h3>Lowest Performing Districts</h3>
      <ul>
        <li><strong>District 9 (Bronx):</strong> 41.8% ELA, 39.5% Math — Highbridge, Morrisania, Melrose</li>
        <li><strong>District 12 (Bronx):</strong> 43.0% ELA, 41.2% Math — Williamsbridge, Wakefield, Baychester</li>
        <li><strong>District 7 (Bronx):</strong> 46.7% ELA, 44.3% Math — South Bronx, Mott Haven, Hunts Point</li>
      </ul>

      <h2 id="economic-factors">The Economic Factor: Poverty and Performance</h2>

      <p>
        The correlation between economic need and academic performance is stark. NYC uses an <strong>Economic Need Index (ENI)</strong> 
        that measures the poverty level of each school's student population. Our analysis shows a clear inverse relationship: 
        as economic need increases, academic performance decreases.
      </p>

      <EconomicImpactChart />

      <p>
        The Bronx districts (9, 12, and 7) consistently show both the highest economic need indices (92%+) 
        and the lowest academic performance. This isn't coincidental — research consistently shows that 
        poverty affects educational outcomes through multiple pathways including:
      </p>

      <ul>
        <li>Limited access to educational resources at home</li>
        <li>Higher rates of housing and food insecurity</li>
        <li>Less access to early childhood education</li>
        <li>Higher teacher turnover in high-need schools</li>
      </ul>

      <Card className="my-6 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Home className="w-6 h-6 text-primary shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-1">What This Means for Parents</h4>
              <p className="text-sm text-muted-foreground mb-0">
                When comparing schools, consider the Economic Need Index as context. A school with 50% proficiency 
                and 90% ENI may actually be outperforming expectations, while a school with 60% proficiency 
                and 40% ENI might be underperforming given its resources.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="gifted-talented">The G&T Advantage</h2>

      <p>
        Schools with Gifted & Talented programs show significantly higher proficiency rates across the board. 
        Our data shows a <strong>13 percentage point difference in ELA</strong> and a <strong>15 percentage point difference in Math</strong>.
      </p>

      <GTComparisonChart />

      <p>
        However, it's important to understand that this difference isn't necessarily because G&T programs 
        make schools better. Rather, G&T programs attract and select students who are already high-performing, 
        which naturally raises the school's average scores. This is a classic example of selection bias.
      </p>

      <h2 id="climate-scores">The Good News: School Climate</h2>

      <p>
        Despite the academic challenges, there's encouraging news about school climate. The average 
        <strong>climate score across NYC schools is 91%</strong>, indicating that most schools provide 
        a safe, supportive environment for learning.
      </p>

      <Card className="my-6 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-1">Climate Score Components</h4>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-0">
                The climate score is based on the NYC School Survey, which measures student safety, 
                teacher-student relationships, academic expectations, and parent engagement. 
                High scores here indicate that schools are doing well at creating positive learning environments.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="takeaways">Key Takeaways for Parents</h2>

      <div className="not-prose my-8">
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Look Beyond Averages</h4>
                  <p className="text-sm text-muted-foreground">
                    Citywide averages hide enormous variation. Individual school performance matters more than district-level statistics.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Context Matters</h4>
                  <p className="text-sm text-muted-foreground">
                    Consider the Economic Need Index when evaluating schools. High-poverty schools face different challenges.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Climate Is Strong</h4>
                  <p className="text-sm text-muted-foreground">
                    Most NYC schools provide safe, supportive environments. Don't let academic scores alone guide your decision.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">G&T Isn't Magic</h4>
                  <p className="text-sm text-muted-foreground">
                    Higher scores in G&T schools largely reflect student selection, not necessarily better teaching.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <h2 id="methodology">About This Analysis</h2>

      <p>
        This analysis uses official NYC Department of Education data from the 2023-24 school year, including:
      </p>

      <ul>
        <li>NYS grades 3-8 ELA and Math test results</li>
        <li>NYC School Survey results for climate scores</li>
        <li>Economic Need Index from DOE student demographic data</li>
        <li>School program information including Gifted & Talented designations</li>
      </ul>

      <p>
        All data is publicly available and has been processed to calculate meaningful metrics for parent decision-making. 
        Our <strong>Overall Score</strong> formula weighs test proficiency (40%), climate score (30%), and progress score (30%) 
        to provide a balanced view of school quality.
      </p>

      <div className="mt-8 p-6 bg-muted rounded-lg not-prose">
        <h3 className="text-lg font-semibold mb-2">Explore the Data Yourself</h3>
        <p className="text-muted-foreground mb-4">
          Use our interactive tools to find and compare schools based on your priorities.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Browse All Schools</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/recommendations">Get Personalized Recommendations</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/map">View Map</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function AdmissionsDemandPost() {
  return (
    <article className="prose prose-lg dark:prose-invert max-w-none">
      <p className="lead text-xl text-muted-foreground">
        Every year, over <strong>185,000 NYC families</strong> apply for Pre-K, 3-K, and Kindergarten spots across the city. 
        Our analysis of NYC DOE admissions data reveals <strong>which schools are most in-demand</strong>, how competitiveness 
        varies by borough, and what the trends mean for your child's application.
      </p>

      <AdmissionsStatsCards />

      <h2 id="understanding-admissions-demand">Understanding NYC Pre-K, 3-K, and Kindergarten Demand</h2>
      
      <p>
        NYC's early childhood education system is one of the largest in the nation. With <strong>universal 3-K and Pre-K</strong> now 
        available citywide, more families than ever are applying for these programs. But not all programs are created equal — and 
        the competition for spots at top-rated schools can be fierce.
      </p>

      <p>
        We measure <strong>admissions demand</strong> using the <strong>application-to-seat ratio</strong>: how many applications 
        a school receives for each available seat. A ratio of 3:1 means three families applied for every one seat — indicating 
        high competition and a lower chance of receiving an offer.
      </p>

      <DemandByGradeChart />

      <h3 id="kindergarten-most-competitive">Kindergarten: The Most Competitive Grade</h3>

      <p>
        Across all boroughs, <strong>Kindergarten programs are the most competitive</strong>, with an average of 3.1 applications 
        per available seat. This translates to roughly a 32% chance of receiving an offer at an average school — though top 
        schools can see ratios of 6:1 or higher.
      </p>

      <ul>
        <li><strong>Kindergarten:</strong> 3.1 apps/seat (32% offer rate average)</li>
        <li><strong>Pre-K:</strong> 2.4 apps/seat (42% offer rate average)</li>
        <li><strong>3-K:</strong> 1.8 apps/seat (56% offer rate average)</li>
      </ul>

      <Card className="my-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
            <div>
              <strong className="text-amber-700 dark:text-amber-400">Why Is Kindergarten So Competitive?</strong>
              <p className="text-sm text-amber-600/80 dark:text-amber-300/80 mt-1 mb-0">
                Unlike 3-K and Pre-K, Kindergarten is mandatory in NYC. This creates a larger applicant pool as all 
                families must enroll their children. Additionally, many families wait to enter the public school 
                system at Kindergarten, having used private or informal childcare for earlier years.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="competitiveness-levels">How We Measure School Competitiveness</h2>

      <p>
        We categorize every NYC early childhood program into four competitiveness tiers based on their application-to-seat ratio:
      </p>

      <div className="not-prose my-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <strong className="text-red-700 dark:text-red-300">Very Competitive</strong>
            </div>
            <p className="text-sm text-red-600/80 dark:text-red-300/80">
              <strong>3+ applications per seat.</strong> Fewer than 1 in 3 applicants receive offers. These are typically high-performing schools in desirable neighborhoods.
            </p>
          </div>
          <div className="border rounded-lg p-4 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <strong className="text-orange-700 dark:text-orange-300">Competitive</strong>
            </div>
            <p className="text-sm text-orange-600/80 dark:text-orange-300/80">
              <strong>2-3 applications per seat.</strong> Roughly 1 in 2 to 1 in 3 applicants receive offers. Still challenging but more accessible.
            </p>
          </div>
          <div className="border rounded-lg p-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <strong className="text-yellow-700 dark:text-yellow-300">Moderate</strong>
            </div>
            <p className="text-sm text-yellow-600/80 dark:text-yellow-300/80">
              <strong>1.2-2 applications per seat.</strong> Good chance of receiving an offer. Most applicants are accommodated.
            </p>
          </div>
          <div className="border rounded-lg p-4 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <strong className="text-emerald-700 dark:text-emerald-300">Accessible</strong>
            </div>
            <p className="text-sm text-emerald-600/80 dark:text-emerald-300/80">
              <strong>Less than 1.2 applications per seat.</strong> Very high likelihood of receiving an offer. May even have waitlist seats available.
            </p>
          </div>
        </div>
      </div>

      <CompetitivenessDistributionChart />

      <p>
        Across NYC, about <strong>20% of early childhood programs</strong> fall into the "Very Competitive" category, 
        while roughly <strong>27% are considered Accessible</strong>. This means there are still plenty of excellent 
        schools where families have a strong chance of enrollment.
      </p>

      <h2 id="borough-demand">Admissions Demand by Borough</h2>

      <p>
        Demand varies significantly across NYC's five boroughs. <strong>Manhattan consistently sees the highest competition</strong> 
        across all grade levels, followed by Brooklyn. Families in the Bronx and Staten Island generally face less competition.
      </p>

      <BoroughDemandChart />

      <h3 id="manhattan-demand">Manhattan: The Most Competitive Borough</h3>

      <p>
        Manhattan schools see the highest application-to-seat ratios citywide:
      </p>

      <ul>
        <li><strong>Manhattan Kindergarten:</strong> 3.8 apps/seat average</li>
        <li><strong>Manhattan Pre-K:</strong> 2.9 apps/seat average</li>
        <li><strong>Manhattan 3-K:</strong> 2.2 apps/seat average</li>
      </ul>

      <p>
        This is driven by a combination of factors: smaller school buildings with limited capacity, high population 
        density in family-friendly neighborhoods, and the concentration of highly-rated schools in districts like 
        <strong>District 2</strong> (Tribeca, Chelsea, Upper East Side) and <strong>District 3</strong> (Upper West Side).
      </p>

      <h3 id="bronx-staten-island">Bronx and Staten Island: More Accessible Options</h3>

      <p>
        Families in the Bronx and Staten Island face significantly less competition. <strong>Staten Island's Kindergarten 
        programs average just 2.1 apps/seat</strong> — meaning nearly half of all first-choice applicants receive offers.
      </p>

      <Card className="my-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Lightbulb className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
            <div>
              <strong className="text-blue-700 dark:text-blue-400">Strategy for Parents</strong>
              <p className="text-sm text-blue-600/80 dark:text-blue-300/80 mt-1 mb-0">
                If you're applying to competitive schools, always include at least one or two "accessible" programs 
                on your ranked choice list. Check our school pages for competitiveness ratings to make informed decisions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="demand-trends">Admissions Demand Trends: 2020-2025</h2>

      <p>
        Competition for NYC early childhood programs has <strong>increased steadily since the pandemic</strong>. 
        After a dip in 2020-21 when many families delayed enrollment, demand has surged:
      </p>

      <DemandTrendChart />

      <ul>
        <li><strong>Kindergarten:</strong> From 2.1 apps/seat (2020-21) to 3.1 apps/seat (2024-25) — a 48% increase</li>
        <li><strong>Pre-K:</strong> From 1.8 apps/seat to 2.4 apps/seat — a 33% increase</li>
        <li><strong>3-K:</strong> From 1.2 apps/seat to 1.8 apps/seat — a 50% increase</li>
      </ul>

      <p>
        This trend reflects both population growth in NYC and increased awareness of the importance of early childhood 
        education. The expansion of universal 3-K has also drawn more families into the public school system earlier.
      </p>

      <h2 id="most-competitive-schools">NYC's Most Competitive Schools</h2>

      <p>
        Some NYC schools are exceptionally difficult to get into. These schools often combine high academic 
        performance, desirable locations, and strong reputations — creating intense competition for limited seats.
      </p>

      <TopCompetitiveSchoolsTable />

      <Card className="my-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
            <div>
              <strong className="text-amber-700 dark:text-amber-400">Don't Just Chase Rankings</strong>
              <p className="text-sm text-amber-600/80 dark:text-amber-300/80 mt-1 mb-0">
                Highly competitive schools aren't necessarily the best fit for every child. Many "accessible" schools 
                offer excellent programs with strong academic outcomes. Use our school comparison tools to evaluate 
                schools based on what matters most to your family.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="application-tips">Tips for NYC Pre-K, 3-K, and Kindergarten Applications</h2>

      <p>
        Based on our analysis of admissions data, here are strategies to improve your chances:
      </p>

      <h3 id="research-competitiveness">1. Research Competitiveness Before Ranking</h3>
      <p>
        Check the competitiveness rating for every school on your list. If all your top choices are "Very Competitive," 
        you're taking a significant risk. Balance aspirational picks with realistic options.
      </p>

      <h3 id="zone-priority">2. Understand Zone Priority</h3>
      <p>
        For many Kindergarten programs, students living in the school's zone receive priority. If you're zoned for a 
        good school, your chances are significantly higher. Check your zone using our map tool.
      </p>

      <h3 id="sibling-priority">3. Consider Sibling Priority</h3>
      <p>
        If you have a child already enrolled at a school, siblings typically receive priority for younger grades. 
        This can dramatically improve your odds at competitive schools.
      </p>

      <h3 id="apply-early">4. Apply During the Primary Round</h3>
      <p>
        Most seats are allocated during the primary application round. Waiting for the waitlist round significantly 
        reduces your options. Apply on time and rank schools carefully.
      </p>

      <h2 id="faq">Frequently Asked Questions About NYC Admissions</h2>

      <div className="not-prose my-6">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="faq-1">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <span>What are my chances of getting into a "Very Competitive" school?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                At "Very Competitive" schools (3+ applications per seat), your first-choice offer rate is typically below 33%. 
                However, your actual chances depend on whether you have zone priority (for K), sibling priority, or other 
                admissions preferences. If you're in-zone for a competitive school, your chances are much higher than if 
                you're applying out-of-zone.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-2">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <span>How does the NYC school lottery work for Pre-K and 3-K?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                NYC uses a ranked-choice lottery system. You rank up to 12 schools in order of preference. The algorithm 
                processes all applications simultaneously, giving each student the highest-ranked school where a seat is 
                available after applying priority rules. Priorities vary by program but typically include siblings, 
                district residents, and Head Start eligibility for 3-K/Pre-K.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-3">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <span>When should I apply for NYC Pre-K, 3-K, or Kindergarten?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                The primary application window typically opens in December/January and closes in March for the following 
                school year. Results are released in spring. Check the NYC DOE website for exact dates. Applying during 
                the primary round gives you access to the most seats — waitlist rounds have fewer options.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-4">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <span>What is the difference between Pre-K and 3-K admissions?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                3-K is for children turning 3 by December 31, while Pre-K is for children turning 4. Both use a similar 
                lottery system, but 3-K generally has less competition because it's newer and not all families enroll 
                children at age 3. Pre-K sees higher demand because it's been universal for longer and many see it as 
                essential kindergarten preparation.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-5">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <span>Does attending 3-K or Pre-K guarantee a Kindergarten spot at the same school?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                Not automatically. However, many schools offer "continuing" or "feeder" patterns where Pre-K students 
                receive priority for Kindergarten. Check with individual schools about their specific policies. Some 
                elementary schools have separate Pre-K programs that don't guarantee K enrollment, while others are 
                fully integrated.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-6">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <span>What if I don't get any of my ranked school choices?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                If you don't receive an offer from any ranked school, you'll be assigned to a school with available seats — 
                often your zoned school for Kindergarten. You can then participate in waitlist rounds for your preferred 
                schools. To avoid this scenario, include at least 2-3 "Accessible" or "Moderate" competitiveness schools 
                on your list.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-7">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <span>How can I find out the competitiveness level of a specific school?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">
                Our school detail pages show competitiveness ratings, application-to-seat ratios, and offer rates for 
                every NYC school with available data. This is premium content based on NYC DOE Local Law 72 admissions 
                reports. You can also use our Lottery Simulator to estimate your odds at specific schools based on 
                your profile.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <h2 id="methodology">Methodology</h2>

      <p>
        This analysis uses official NYC DOE admissions data from Local Law 72 reports, which require the city to 
        publish detailed admissions statistics for all public schools. We analyzed application counts, seats offered, 
        and offer rates across approximately 1,500 3-K, Pre-K, and Kindergarten programs citywide.
      </p>

      <p>
        Competitiveness levels are calculated using the application-to-seat ratio:
      </p>

      <ul>
        <li><strong>Very Competitive:</strong> 3.0+ applications per seat</li>
        <li><strong>Competitive:</strong> 2.0-3.0 applications per seat</li>
        <li><strong>Moderate:</strong> 1.2-2.0 applications per seat</li>
        <li><strong>Accessible:</strong> Less than 1.2 applications per seat</li>
      </ul>

      <div className="mt-8 p-6 bg-muted rounded-lg not-prose">
        <h3 className="text-lg font-semibold mb-2">Find Your Perfect School</h3>
        <p className="text-muted-foreground mb-4">
          Use our tools to research schools, check competitiveness ratings, and simulate your lottery odds.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Browse All Schools</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/lottery-simulator">Lottery Simulator</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/recommendations">Get Recommendations</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function BestKindergartensPost() {
  return (
    <article className="prose prose-lg dark:prose-invert max-w-none">
      <p className="lead text-xl text-muted-foreground">
        Finding the right kindergarten is one of the most important decisions NYC parents face. We analyzed data from over <strong>800 elementary schools</strong> offering kindergarten programs to identify the top-performing K programs in every borough.
      </p>

      <Card className="my-6 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <TrendingUp className="w-6 h-6 text-primary shrink-0 mt-1" />
            <div>
              <strong className="text-foreground">2025 Kindergarten Quick Facts</strong>
              <ul className="text-sm text-muted-foreground mt-2 mb-0 space-y-1">
                <li>NYC has <strong>800+ public kindergarten programs</strong></li>
                <li>Average class size: <strong>20-25 students</strong></li>
                <li>Full-day kindergarten available at all public schools</li>
                <li>Gifted & Talented programs start at kindergarten level</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="how-we-rank">How We Rank Kindergarten Programs</h2>
      
      <p>
        Our rankings consider multiple factors that matter to parents:
      </p>

      <ul>
        <li><strong>Academic Foundation (40%)</strong> - Early literacy and numeracy scores, transition to 1st grade readiness</li>
        <li><strong>School Climate (30%)</strong> - Safety, engagement, and NYC School Survey parent satisfaction ratings</li>
        <li><strong>Progress Score (30%)</strong> - How much academic growth students show year-over-year</li>
      </ul>

      <h2 id="manhattan-kindergartens">Best Manhattan Kindergartens</h2>

      <p>
        Manhattan offers some of NYC's most competitive kindergarten programs, particularly in Districts 2 (Upper East Side, Tribeca) and District 3 (Upper West Side).
      </p>

      <Card className="my-6 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
            <div>
              <strong className="text-emerald-700 dark:text-emerald-400">Top Manhattan K Programs</strong>
              <ul className="text-sm text-emerald-600/80 dark:text-emerald-300/80 mt-2 mb-0 space-y-1">
                <li><strong>PS 6 Lillie Devereaux Blake</strong> (D2) - 90%+ proficiency</li>
                <li><strong>PS 77 Lower Lab</strong> (D2) - Outstanding climate scores</li>
                <li><strong>PS 199 Jessie Isador Straus</strong> (D3) - Strong academic growth</li>
                <li><strong>PS 87 William Sherman</strong> (D3) - Excellent parent satisfaction</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="brooklyn-kindergartens">Best Brooklyn Kindergartens</h2>

      <p>
        Brooklyn's diverse neighborhoods offer excellent kindergarten options from Park Slope to Brooklyn Heights to Williamsburg. District 15 and District 13 consistently rank among the top.
      </p>

      <Card className="my-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
            <div>
              <strong className="text-blue-700 dark:text-blue-400">Top Brooklyn K Programs</strong>
              <ul className="text-sm text-blue-600/80 dark:text-blue-300/80 mt-2 mb-0 space-y-1">
                <li><strong>PS 321 William Penn</strong> (D15) - Park Slope's flagship school</li>
                <li><strong>PS 107 John W Kimball</strong> (D15) - Exceptional progress scores</li>
                <li><strong>PS 8 Robert Fulton</strong> (D13) - Brooklyn Heights excellence</li>
                <li><strong>PS 84 José de Diego</strong> (D14) - Strong dual-language K program</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="queens-kindergartens">Best Queens Kindergartens</h2>

      <p>
        Queens offers excellent value with top-rated kindergartens in Districts 26 (Bayside/Douglaston), 25 (Flushing), and 28 (Forest Hills/Jamaica Estates).
      </p>

      <Card className="my-6 border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-purple-600 shrink-0 mt-1" />
            <div>
              <strong className="text-purple-700 dark:text-purple-400">Top Queens K Programs</strong>
              <ul className="text-sm text-purple-600/80 dark:text-purple-300/80 mt-2 mb-0 space-y-1">
                <li><strong>PS 188 Kingsbury</strong> (D26) - Top Queens academic scores</li>
                <li><strong>PS 203 Oakland Gardens</strong> (D26) - Excellent climate ratings</li>
                <li><strong>PS 173 Fresh Meadows</strong> (D26) - Strong parent satisfaction</li>
                <li><strong>PS 196 Grand Central</strong> (D28) - Forest Hills favorite</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="bronx-kindergartens">Best Bronx Kindergartens</h2>

      <p>
        The Bronx has standout kindergarten programs, especially in District 11 (Morris Park/Pelham Gardens) and Riverdale's District 10.
      </p>

      <Card className="my-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-orange-600 shrink-0 mt-1" />
            <div>
              <strong className="text-orange-700 dark:text-orange-400">Top Bronx K Programs</strong>
              <ul className="text-sm text-orange-600/80 dark:text-orange-300/80 mt-2 mb-0 space-y-1">
                <li><strong>PS 83 Donald Hertz</strong> (D11) - Morris Park's highest-rated</li>
                <li><strong>PS 81 Robert Christen</strong> (D11) - Excellent academics</li>
                <li><strong>PS 24 Spuyten Duyvil</strong> (D10) - Riverdale gem</li>
                <li><strong>PS 7 Milton Fein</strong> (D10) - Strong community engagement</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="staten-island-kindergartens">Best Staten Island Kindergartens</h2>

      <p>
        Staten Island's District 31 offers some of the city's top-performing kindergartens, with excellent academics and strong community ties.
      </p>

      <Card className="my-6 border-teal-200 bg-teal-50 dark:bg-teal-950/20 dark:border-teal-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-teal-600 shrink-0 mt-1" />
            <div>
              <strong className="text-teal-700 dark:text-teal-400">Top Staten Island K Programs</strong>
              <ul className="text-sm text-teal-600/80 dark:text-teal-300/80 mt-2 mb-0 space-y-1">
                <li><strong>PS 36 J C Drumgoole</strong> (D31) - Highest SI proficiency</li>
                <li><strong>PS 56 Louis DeSario</strong> (D31) - Excellent climate scores</li>
                <li><strong>PS 29 Bardwell</strong> (D31) - Strong community support</li>
                <li><strong>PS 3 Margaret Gioiosa</strong> (D31) - Top progress scores</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="gifted-talented">Gifted & Talented Kindergarten Programs</h2>

      <p>
        NYC offers district-level Gifted & Talented programs starting at kindergarten. These programs require testing and are highly competitive:
      </p>

      <ul>
        <li><strong>District G&T Programs</strong> - Available in most districts, admission based on testing</li>
        <li><strong>Citywide G&T Schools</strong> - NEST+m, TAG Young Scholars, Anderson School</li>
        <li><strong>Application Timeline</strong> - Testing typically opens in late fall for the following school year</li>
      </ul>

      <h2 id="faq">Frequently Asked Questions</h2>

      <Accordion type="single" collapsible className="w-full not-prose">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              What age does my child need to be for NYC kindergarten?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Children must turn 5 years old by December 31st of the school year they're entering kindergarten. For fall 2025 enrollment, your child must be born on or before December 31, 2020.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              How do I apply for NYC kindergarten?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Apply through MySchools.nyc during the application period (typically January-March). You can rank up to 12 schools. Zoned schools guarantee admission if you live in the zone; non-zoned schools use a lottery.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Do I have to send my child to my zoned school?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            No. While zoned schools guarantee a spot, you can apply to any public school in NYC. Non-zoned schools, magnet programs, and charter schools all use lottery-based admission.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-4">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              What's the difference between half-day and full-day kindergarten?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            All NYC public schools offer full-day kindergarten (6+ hours). Half-day programs are rare and typically only found in some private or parochial schools.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-5">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              When is the NYC kindergarten application deadline?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            The kindergarten application typically opens in January and closes in early March. Offers are released in spring (usually April). Check MySchools.nyc for exact dates each year.
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-8 p-6 bg-muted rounded-lg not-prose">
        <h3 className="text-lg font-semibold mb-2">Find Kindergarten Programs Near You</h3>
        <p className="text-muted-foreground mb-4">
          Use our tools to explore kindergarten options, compare schools, and check lottery competitiveness.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Browse All Schools</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/lottery-simulator">Check Lottery Odds</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function BestElementarySchoolsPost() {
  return (
    <article className="prose prose-lg dark:prose-invert max-w-none">
      <p className="lead text-xl text-muted-foreground">
        Choosing an elementary school shapes your child's educational foundation. Our analysis of <strong>1,000+ NYC elementary schools</strong> reveals the highest-performing K-5 programs based on test scores, student growth, and school climate.
      </p>

      <Card className="my-6 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <TrendingUp className="w-6 h-6 text-primary shrink-0 mt-1" />
            <div>
              <strong className="text-foreground">2025 Elementary School Stats</strong>
              <ul className="text-sm text-muted-foreground mt-2 mb-0 space-y-1">
                <li><strong>1,000+ elementary schools</strong> across 32 districts</li>
                <li>Citywide ELA proficiency: <strong>54.9%</strong></li>
                <li>Citywide Math proficiency: <strong>55.0%</strong></li>
                <li>Top schools exceed <strong>90% proficiency</strong></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="ranking-methodology">Our Ranking Methodology</h2>
      
      <p>
        We evaluate elementary schools using a comprehensive scoring system:
      </p>

      <ul>
        <li><strong>Test Proficiency (40%)</strong> - Combined ELA and Math proficiency rates from NYSED assessments</li>
        <li><strong>Climate Score (30%)</strong> - Safety, engagement, and NYC School Survey results</li>
        <li><strong>Progress Score (30%)</strong> - Student academic growth compared to similar schools</li>
      </ul>

      <h2 id="top-manhattan-elementary">Top Manhattan Elementary Schools</h2>

      <p>
        Manhattan's Districts 2 and 3 dominate the city's top elementary rankings, with schools regularly achieving 80%+ proficiency rates.
      </p>

      <Card className="my-6 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
            <div>
              <strong className="text-emerald-700 dark:text-emerald-400">Manhattan's Best Elementary Schools</strong>
              <ul className="text-sm text-emerald-600/80 dark:text-emerald-300/80 mt-2 mb-0 space-y-1">
                <li><strong>PS 6 Lillie Devereaux Blake</strong> (D2) - 91% ELA, 89% Math</li>
                <li><strong>PS 77 Lower Lab School</strong> (D2) - Outstanding overall score</li>
                <li><strong>PS 199 Jessie Isador Straus</strong> (D3) - Consistent top performer</li>
                <li><strong>PS 87 William Sherman</strong> (D3) - Excellent progress scores</li>
                <li><strong>PS 234 Independence School</strong> (D2) - TriBeCa excellence</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="top-brooklyn-elementary">Top Brooklyn Elementary Schools</h2>

      <p>
        Brooklyn's District 15 (Park Slope, Carroll Gardens) and District 22 (Midwood, Sheepshead Bay) lead the borough's elementary rankings.
      </p>

      <Card className="my-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
            <div>
              <strong className="text-blue-700 dark:text-blue-400">Brooklyn's Best Elementary Schools</strong>
              <ul className="text-sm text-blue-600/80 dark:text-blue-300/80 mt-2 mb-0 space-y-1">
                <li><strong>PS 321 William Penn</strong> (D15) - Park Slope's crown jewel</li>
                <li><strong>PS 107 John W Kimball</strong> (D15) - Top academic growth</li>
                <li><strong>PS 8 Robert Fulton</strong> (D13) - Brooklyn Heights leader</li>
                <li><strong>PS 130 Parkside</strong> (D22) - Exceptional math scores</li>
                <li><strong>PS 217 Colonel David Marcus</strong> (D22) - High overall rating</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="top-queens-elementary">Top Queens Elementary Schools</h2>

      <p>
        Queens' District 26 consistently ranks as NYC's top-performing district, with multiple schools exceeding 85% proficiency.
      </p>

      <Card className="my-6 border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-purple-600 shrink-0 mt-1" />
            <div>
              <strong className="text-purple-700 dark:text-purple-400">Queens' Best Elementary Schools</strong>
              <ul className="text-sm text-purple-600/80 dark:text-purple-300/80 mt-2 mb-0 space-y-1">
                <li><strong>PS 188 Kingsbury</strong> (D26) - District 26's highest scores</li>
                <li><strong>PS 203 Oakland Gardens</strong> (D26) - Excellent in all metrics</li>
                <li><strong>PS 173 Fresh Meadows</strong> (D26) - Outstanding climate</li>
                <li><strong>PS 196 Grand Central</strong> (D28) - Forest Hills favorite</li>
                <li><strong>PS 144 Col Jeromus Remsen</strong> (D28) - Strong community</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="top-bronx-elementary">Top Bronx Elementary Schools</h2>

      <p>
        The Bronx's top elementary schools are concentrated in Districts 10 (Riverdale) and 11 (Pelham/Morris Park).
      </p>

      <Card className="my-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-orange-600 shrink-0 mt-1" />
            <div>
              <strong className="text-orange-700 dark:text-orange-400">Bronx's Best Elementary Schools</strong>
              <ul className="text-sm text-orange-600/80 dark:text-orange-300/80 mt-2 mb-0 space-y-1">
                <li><strong>PS 24 Spuyten Duyvil</strong> (D10) - Riverdale's top school</li>
                <li><strong>PS 81 Robert Christen</strong> (D11) - Morris Park excellence</li>
                <li><strong>PS 83 Donald Hertz</strong> (D11) - Outstanding academics</li>
                <li><strong>PS 7 Milton Fein</strong> (D10) - High progress scores</li>
                <li><strong>PS 175 City Island</strong> (D11) - Unique island community</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="top-staten-island-elementary">Top Staten Island Elementary Schools</h2>

      <p>
        Staten Island's District 31 offers many high-performing elementary options with strong community engagement.
      </p>

      <Card className="my-6 border-teal-200 bg-teal-50 dark:bg-teal-950/20 dark:border-teal-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-teal-600 shrink-0 mt-1" />
            <div>
              <strong className="text-teal-700 dark:text-teal-400">Staten Island's Best Elementary Schools</strong>
              <ul className="text-sm text-teal-600/80 dark:text-teal-300/80 mt-2 mb-0 space-y-1">
                <li><strong>PS 36 J C Drumgoole</strong> - Island's highest proficiency</li>
                <li><strong>PS 56 Louis DeSario</strong> - Excellent all-around</li>
                <li><strong>PS 29 Bardwell</strong> - Strong academics & climate</li>
                <li><strong>PS 3 Margaret Gioiosa</strong> - Top progress scores</li>
                <li><strong>PS 50 Frank Hankinson</strong> - Great community</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="what-to-look-for">What to Look for in an Elementary School</h2>

      <Card className="my-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Lightbulb className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
            <div>
              <strong className="text-blue-700 dark:text-blue-400">Key Factors for Parents</strong>
              <ul className="text-sm text-blue-600/80 dark:text-blue-300/80 mt-2 mb-0 space-y-2">
                <li><strong>Academic Performance</strong> - Look at both current scores AND trends over time</li>
                <li><strong>School Climate</strong> - Safety, engagement, and parent satisfaction matter</li>
                <li><strong>Special Programs</strong> - G&T, dual-language, STEM focus, arts integration</li>
                <li><strong>After-School Options</strong> - Many schools offer enrichment programs</li>
                <li><strong>Class Size</strong> - Smaller classes often mean more individual attention</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="faq">Frequently Asked Questions</h2>

      <Accordion type="single" collapsible className="w-full not-prose">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              What grades are considered elementary school in NYC?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            NYC elementary schools typically serve grades K-5, though some schools are K-8 or have different configurations. Most students transition to middle school after 5th grade.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Can I choose any elementary school in NYC?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            You have a guaranteed spot at your zoned school (based on your address), but you can apply to any public school through MySchools.nyc. Non-zoned schools use lottery admission with priority tiers.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              What is a "good" test score for an NYC elementary school?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            The citywide average is around 55% proficiency. Schools above 70% are considered strong performers, and schools above 85% are exceptional. However, also consider progress scores - some schools help students grow significantly even if overall scores are moderate.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-4">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              How important is the school district vs. the individual school?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Both matter. High-performing districts (like D2, D3, D26) have more consistently strong schools, but every district has standout schools. Look at individual school data rather than relying solely on district reputation.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-5">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Should I prioritize test scores or school climate?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Both are important. A school with great test scores but poor climate may not be the right fit. Look for schools that balance academic rigor with positive culture, safety, and parent engagement.
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-8 p-6 bg-muted rounded-lg not-prose">
        <h3 className="text-lg font-semibold mb-2">Explore Elementary Schools</h3>
        <p className="text-muted-foreground mb-4">
          Use our interactive tools to compare schools, view detailed metrics, and find the best fit for your family.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Browse All Schools</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/compare">Compare Schools</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/recommendations">Get Recommendations</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function BestMiddleSchoolsPost() {
  return (
    <article className="prose prose-lg dark:prose-invert max-w-none">
      <p className="lead text-xl text-muted-foreground">
        The transition to middle school is a pivotal moment in your child's education. We analyzed <strong>500+ NYC middle schools</strong> to identify the top programs for grades 6-8, considering academics, specialized programs, and school environment.
      </p>

      <Card className="my-6 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <TrendingUp className="w-6 h-6 text-primary shrink-0 mt-1" />
            <div>
              <strong className="text-foreground">NYC Middle School Landscape</strong>
              <ul className="text-sm text-muted-foreground mt-2 mb-0 space-y-1">
                <li><strong>500+ middle school programs</strong> across NYC</li>
                <li>Mix of standalone middle schools and K-8/6-12 configurations</li>
                <li>Screened, unscreened, and specialized programs available</li>
                <li>Application process varies by school type</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="middle-school-types">Types of NYC Middle Schools</h2>
      
      <p>
        Understanding the different types of middle schools helps you navigate the application process:
      </p>

      <ul>
        <li><strong>Zoned Middle Schools</strong> - Guaranteed admission based on address</li>
        <li><strong>District Unscreened</strong> - Lottery admission for district residents</li>
        <li><strong>Screened/Selective</strong> - Admission based on academics, attendance, and sometimes auditions</li>
        <li><strong>Specialized Programs</strong> - STEM, arts, dual-language, and magnet programs</li>
        <li><strong>K-8 Schools</strong> - Continue through middle school without reapplying</li>
      </ul>

      <h2 id="top-manhattan-middle">Top Manhattan Middle Schools</h2>

      <p>
        Manhattan's screened middle schools are among the most competitive in the city, with some receiving thousands of applications.
      </p>

      <Card className="my-6 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
            <div>
              <strong className="text-emerald-700 dark:text-emerald-400">Manhattan's Best Middle Schools</strong>
              <ul className="text-sm text-emerald-600/80 dark:text-emerald-300/80 mt-2 mb-0 space-y-1">
                <li><strong>Lab Middle School</strong> (D2) - Top academics citywide</li>
                <li><strong>MS 54 Booker T Washington</strong> (D3) - Screened excellence</li>
                <li><strong>East Side Middle School</strong> (D2) - Outstanding scores</li>
                <li><strong>NEST+m</strong> (D1) - Citywide G&T 6-12</li>
                <li><strong>Wagner Middle School</strong> (D2) - Arts integration</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="top-brooklyn-middle">Top Brooklyn Middle Schools</h2>

      <p>
        Brooklyn offers excellent middle school options from established screened programs to innovative unscreened schools.
      </p>

      <Card className="my-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
            <div>
              <strong className="text-blue-700 dark:text-blue-400">Brooklyn's Best Middle Schools</strong>
              <ul className="text-sm text-blue-600/80 dark:text-blue-300/80 mt-2 mb-0 space-y-1">
                <li><strong>Mark Twain IS 239</strong> (D21) - Citywide G&T for talented</li>
                <li><strong>JHS 51 William Alexander</strong> (D15) - Park Slope strong</li>
                <li><strong>MS 447 Math & Science</strong> (D15) - STEM excellence</li>
                <li><strong>MS 51 William Alexander</strong> (D15) - High academics</li>
                <li><strong>Bay Academy IS 98</strong> (D22) - South Brooklyn leader</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="top-queens-middle">Top Queens Middle Schools</h2>

      <p>
        Queens' middle schools, particularly in Districts 25, 26, and 28, offer strong academic programs with diverse student bodies.
      </p>

      <Card className="my-6 border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-purple-600 shrink-0 mt-1" />
            <div>
              <strong className="text-purple-700 dark:text-purple-400">Queens' Best Middle Schools</strong>
              <ul className="text-sm text-purple-600/80 dark:text-purple-300/80 mt-2 mb-0 space-y-1">
                <li><strong>IS 74 Nathaniel Hawthorne</strong> (D26) - Top Queens scores</li>
                <li><strong>JHS 194 William Carr</strong> (D26) - Excellent academics</li>
                <li><strong>MS 158 Marie Curie</strong> (D26) - Strong STEM focus</li>
                <li><strong>IS 25 Adrien Block</strong> (D25) - Flushing excellence</li>
                <li><strong>JHS 157 Stephen A Halsey</strong> (D25) - High progress</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="top-bronx-middle">Top Bronx Middle Schools</h2>

      <p>
        The Bronx has strong middle school options, especially in Districts 10 and 11, with several citywide programs.
      </p>

      <Card className="my-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-orange-600 shrink-0 mt-1" />
            <div>
              <strong className="text-orange-700 dark:text-orange-400">Bronx's Best Middle Schools</strong>
              <ul className="text-sm text-orange-600/80 dark:text-orange-300/80 mt-2 mb-0 space-y-1">
                <li><strong>MS 101 Edward R Byrne</strong> (D11) - Bronx's highest</li>
                <li><strong>MS 141 Riverdale/Kingsbridge</strong> (D10) - Strong academics</li>
                <li><strong>JHS 144 Michelangelo</strong> (D11) - Arts & academics</li>
                <li><strong>MS 118 William W Niles</strong> (D10) - Riverdale area</li>
                <li><strong>MS 180 Dr Daniel Fisher</strong> (D11) - Solid performer</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="top-staten-island-middle">Top Staten Island Middle Schools</h2>

      <p>
        Staten Island's District 31 middle schools offer strong academics with close-knit community feel.
      </p>

      <Card className="my-6 border-teal-200 bg-teal-50 dark:bg-teal-950/20 dark:border-teal-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-teal-600 shrink-0 mt-1" />
            <div>
              <strong className="text-teal-700 dark:text-teal-400">Staten Island's Best Middle Schools</strong>
              <ul className="text-sm text-teal-600/80 dark:text-teal-300/80 mt-2 mb-0 space-y-1">
                <li><strong>IS 24 Myra S Barnes</strong> - Top SI middle school</li>
                <li><strong>IS 27 Anning S Prall</strong> - Strong academics</li>
                <li><strong>IS 72 Rocco Laurie</strong> - High scores</li>
                <li><strong>IS 34 Tottenville</strong> - South Shore leader</li>
                <li><strong>IS 75 Frank D Paulo</strong> - Solid performer</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="screened-admissions">Understanding Screened Admissions</h2>

      <Card className="my-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
            <div>
              <strong className="text-amber-700 dark:text-amber-400">Screened School Factors</strong>
              <ul className="text-sm text-amber-600/80 dark:text-amber-300/80 mt-2 mb-0 space-y-2">
                <li><strong>Grades</strong> - 4th and 5th grade report cards</li>
                <li><strong>Test Scores</strong> - State ELA and Math assessments</li>
                <li><strong>Attendance</strong> - Consistent attendance record</li>
                <li><strong>Auditions</strong> - For performing arts programs</li>
                <li><strong>Essays/Interviews</strong> - Some programs require these</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="faq">Frequently Asked Questions</h2>

      <Accordion type="single" collapsible className="w-full not-prose">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              When do I apply for NYC middle school?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Middle school applications typically open in fall (October-November) for 5th graders entering 6th grade the following year. The deadline is usually in early December, with offers released in spring.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              What is a screened middle school?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Screened schools review applicants based on criteria like grades, test scores, and attendance. They rank applicants and make offers accordingly. This is different from lottery-based unscreened schools.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Can I apply to middle schools outside my district?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Yes! While some schools have district priority, many accept applications citywide. Screened schools often have no geographic restrictions. Check each school's admissions policy on MySchools.nyc.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-4">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              What are "citywide" middle school programs?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Citywide programs accept students from all five boroughs. Examples include Mark Twain (D21), NEST+m, and various specialized programs. Competition is intense as the entire city applies.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-5">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Should I stay at a K-8 school or apply to middle school?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            It depends on your school and goals. K-8 schools offer continuity and don't require reapplication. However, standalone middle schools often have more specialized programs and prepare students for competitive high school applications.
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-8 p-6 bg-muted rounded-lg not-prose">
        <h3 className="text-lg font-semibold mb-2">Find Your Middle School</h3>
        <p className="text-muted-foreground mb-4">
          Explore middle school options, compare programs, and prepare for the application process.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Browse All Schools</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/compare">Compare Schools</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function BestCharterSchoolsPost() {
  return (
    <article className="prose prose-lg dark:prose-invert max-w-none">
      <p className="lead text-xl text-muted-foreground">
        NYC's <strong>280+ charter schools</strong> offer alternatives to traditional public schools. We analyzed performance data to identify the top-performing charter networks and individual schools, along with application tips and lottery strategies.
      </p>

      <Card className="my-6 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <TrendingUp className="w-6 h-6 text-primary shrink-0 mt-1" />
            <div>
              <strong className="text-foreground">NYC Charter School Facts</strong>
              <ul className="text-sm text-muted-foreground mt-2 mb-0 space-y-1">
                <li><strong>280+ charter schools</strong> serving 140,000+ students</li>
                <li>Free public schools with lottery-based admission</li>
                <li>Independently operated with public funding</li>
                <li>Often have longer school days and unique curricula</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="charter-vs-public">Charter vs. Traditional Public Schools</h2>
      
      <p>
        Charter schools are public schools that operate independently from the DOE. Key differences include:
      </p>

      <ul>
        <li><strong>Admission</strong> - Lottery-based, not zoned (anyone can apply)</li>
        <li><strong>Schedule</strong> - Often longer school days and years</li>
        <li><strong>Curriculum</strong> - More flexibility in teaching methods</li>
        <li><strong>Accountability</strong> - Must meet performance benchmarks or risk closure</li>
        <li><strong>Funding</strong> - Receive public funds but may also have private donors</li>
      </ul>

      <h2 id="top-charter-networks">Top-Performing Charter Networks</h2>

      <p>
        Several charter networks consistently outperform district averages across multiple schools:
      </p>

      <Card className="my-6 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
            <div>
              <strong className="text-emerald-700 dark:text-emerald-400">Top Charter Networks</strong>
              <ul className="text-sm text-emerald-600/80 dark:text-emerald-300/80 mt-2 mb-0 space-y-1">
                <li><strong>Success Academy</strong> - 47 schools, consistently highest test scores</li>
                <li><strong>KIPP NYC</strong> - 18 schools, strong college prep focus</li>
                <li><strong>Achievement First</strong> - 12 schools, emphasis on rigor</li>
                <li><strong>Uncommon Schools</strong> - 16 schools, data-driven approach</li>
                <li><strong>Democracy Prep</strong> - 8 schools, civic engagement focus</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="top-individual-charters">Top Individual Charter Schools</h2>

      <p>
        These charter schools rank among NYC's highest performers across all school types:
      </p>

      <Card className="my-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
            <div>
              <strong className="text-blue-700 dark:text-blue-400">Highest-Rated Charter Schools</strong>
              <ul className="text-sm text-blue-600/80 dark:text-blue-300/80 mt-2 mb-0 space-y-1">
                <li><strong>Success Academy Harlem 1</strong> - 95%+ proficiency</li>
                <li><strong>Success Academy Bronx 1</strong> - Outstanding math scores</li>
                <li><strong>KIPP Infinity</strong> - Harlem's top middle school</li>
                <li><strong>Achievement First Brownsville</strong> - Brooklyn leader</li>
                <li><strong>Uncommon Schools North Star</strong> - High growth scores</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="charter-by-borough">Charter Schools by Borough</h2>

      <h3>Brooklyn Charters</h3>
      <p>
        Brooklyn has the highest concentration of charter schools, with strong options in Bed-Stuy, Crown Heights, and Brownsville.
      </p>

      <h3>Bronx Charters</h3>
      <p>
        The South Bronx has many high-performing charters, particularly from Success Academy, KIPP, and Uncommon Schools networks.
      </p>

      <h3>Manhattan Charters</h3>
      <p>
        Harlem is home to numerous charter options, including several Success Academy and Democracy Prep campuses.
      </p>

      <h3>Queens & Staten Island</h3>
      <p>
        Fewer charter options, but growing. Queens has emerging networks while Staten Island has limited charter presence.
      </p>

      <h2 id="lottery-tips">Charter School Lottery Tips</h2>

      <Card className="my-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Lightbulb className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
            <div>
              <strong className="text-blue-700 dark:text-blue-400">Improve Your Lottery Chances</strong>
              <ul className="text-sm text-blue-600/80 dark:text-blue-300/80 mt-2 mb-0 space-y-2">
                <li><strong>Apply Early</strong> - Many charters give priority to early applicants</li>
                <li><strong>Apply to Multiple Schools</strong> - Each lottery is independent</li>
                <li><strong>Sibling Priority</strong> - If one child attends, siblings get preference</li>
                <li><strong>Check Deadlines</strong> - Each charter has its own timeline</li>
                <li><strong>Geographic Priority</strong> - Some give preference to local students</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="what-to-consider">What to Consider About Charters</h2>

      <Card className="my-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
            <div>
              <strong className="text-amber-700 dark:text-amber-400">Important Considerations</strong>
              <ul className="text-sm text-amber-600/80 dark:text-amber-300/80 mt-2 mb-0 space-y-2">
                <li><strong>Longer Hours</strong> - Many charters have 7:30am-4:30pm schedules</li>
                <li><strong>Strict Discipline</strong> - Some networks have rigid behavior policies</li>
                <li><strong>Transportation</strong> - May not have yellow bus service</li>
                <li><strong>Special Needs</strong> - Services may vary from DOE schools</li>
                <li><strong>Attrition</strong> - Check how many students leave before graduation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 id="faq">Frequently Asked Questions</h2>

      <Accordion type="single" collapsible className="w-full not-prose">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Are charter schools free?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Yes, charter schools are free public schools. They receive public funding and cannot charge tuition. However, some may request (not require) parent donations.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              How do I apply to a charter school?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Apply directly through each charter school's website or through the NYC Charter Center. Unlike DOE schools, charters have their own application timelines and processes. Most hold lotteries in spring.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              What are my odds in a charter lottery?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            It varies widely. Popular schools like Success Academy Harlem may have 10+ applicants per seat. Newer or less well-known charters may have better odds. Check our lottery simulator for estimates.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-4">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Can my child get an IEP at a charter school?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Yes, charter schools must serve students with disabilities. However, services may differ from DOE schools. Ask specifically about how the school implements IEPs before enrolling.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-5">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Why do some charter schools have higher test scores?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Several factors: longer school days, more instructional time, data-driven teaching, strict discipline policies, and sometimes selective attrition (students who struggle may transfer out). Compare apples to apples when evaluating.
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-8 p-6 bg-muted rounded-lg not-prose">
        <h3 className="text-lg font-semibold mb-2">Explore Charter Options</h3>
        <p className="text-muted-foreground mb-4">
          Browse charter schools, compare performance data, and check lottery competitiveness.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Browse All Schools</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/lottery-simulator">Lottery Simulator</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/compare">Compare Schools</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = getBlogPost(slug || "");

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SEOHead title="Post Not Found - NYC School Ratings Blog" />
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Blog Post Not Found</h1>
          <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist.</p>
          <Button asChild>
            <Link href="/blog">Back to Blog</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.description,
    "datePublished": post.publishedAt,
    "author": {
      "@type": "Organization",
      "name": post.author
    },
    "publisher": {
      "@type": "Organization",
      "name": "NYC School Ratings",
      "url": "https://nycschoolsratings.com"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://nycschoolsratings.com/blog/${post.slug}`
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title={`${post.title} - NYC School Ratings Blog`}
        description={post.description}
        canonicalPath={`/blog/${post.slug}`}
      />
      <StructuredData data={articleSchema} />

      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6" data-testid="breadcrumb-nav">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors" data-testid="breadcrumb-home">
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4" />
              <Link href="/blog" className="hover:text-foreground transition-colors" data-testid="breadcrumb-blog">
                Blog
              </Link>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-medium truncate max-w-[200px] md:max-w-none" data-testid="breadcrumb-current">
                {post.title.length > 40 ? post.title.substring(0, 40) + '...' : post.title}
              </span>
            </li>
          </ol>
        </nav>

        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="secondary">{post.category}</Badge>
            <div className="flex items-center text-sm text-muted-foreground gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(post.publishedAt)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {post.readTime}
              </span>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="heading-blog-post">
            {post.title}
          </h1>

          <p className="text-sm text-muted-foreground">
            By {post.author}
          </p>
        </div>

        {post.slug === "best-nyc-kindergartens-2026" && <BestKindergartensPost />}
        {post.slug === "best-nyc-elementary-schools-2026" && <BestElementarySchoolsPost />}
        {post.slug === "best-nyc-middle-schools-2026" && <BestMiddleSchoolsPost />}
        {post.slug === "best-nyc-charter-schools-2026" && <BestCharterSchoolsPost />}
        {post.slug === "2023-24-doe-data-analysis" && <DOEDataAnalysisPost />}
        {post.slug === "nyc-schools-2025-covid-recovery" && <CovidRecoveryPost />}
        {post.slug === "nyc-prek-3k-kindergarten-admissions-demand-2025" && <AdmissionsDemandPost />}

        <div className="border-t mt-12 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: post.title,
                  text: post.description,
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }} data-testid="button-share">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
