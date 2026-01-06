import { useParams, Link } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData } from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getBlogPost } from "@/lib/blog-data";
import { Calendar, Clock, ArrowLeft, Share2, TrendingUp, AlertTriangle, CheckCircle, Home, Lightbulb } from "lucide-react";
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
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/blog" data-testid="link-back-to-blog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Link>
          </Button>

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
