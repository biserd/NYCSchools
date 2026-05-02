import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Shield, Database, Calculator, MapPin } from "lucide-react";
import { SAFETY_RADIUS_OPTIONS, SAFETY_OFFENSE_WEIGHTS } from "@shared/schema";

export default function SafetyMethodologyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Neighborhood Safety Index Methodology | NYC School Ratings"
        description="Learn exactly how we calculate the 0-100 Neighborhood Safety Index for every NYC school using NYPD complaint data, severity weights, and citywide percentiles."
        path="/safety-methodology"
      />
      <AppHeader />

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:underline" data-testid="link-home">
              Home
            </Link>
            <span>/</span>
            <span>Safety Methodology</span>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-methodology">
            <Shield className="w-7 h-7" />
            Neighborhood Safety Index Methodology
          </h1>
          <p className="text-muted-foreground">
            How we turn NYPD complaint data into a single 0–100 score that's
            easy for parents to read and compare.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5" />
              Data Source
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              The Neighborhood Safety Index is calculated using publicly
              available NYPD complaint records from{" "}
              <a
                href="https://opendata.cityofnewyork.us/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                data-testid="link-nyc-open-data"
              >
                NYC Open Data
              </a>
              :
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <span className="font-mono text-xs">5uac-w243</span> — NYPD
                Complaint Data Current Year-to-Date
              </li>
              <li>
                <span className="font-mono text-xs">qgea-i56i</span> — NYPD
                Complaint Data Historic
              </li>
            </ul>
            <p>
              Data is refreshed monthly. Each complaint record includes a
              precise location (latitude / longitude), the date the incident
              was reported, and the offense classification.
            </p>
            <p className="text-muted-foreground">
              Note: Counts reflect <em>reported</em> complaints, not
              convictions. Reporting rates can vary by neighborhood.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Geographic Scope
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              For every school we count complaints inside one of four radii,
              measured as a straight-line (Haversine) distance from the
              school's address:
            </p>
            <div className="flex flex-wrap gap-2">
              {SAFETY_RADIUS_OPTIONS.map((r) => (
                <Badge
                  key={r.meters}
                  variant="outline"
                  data-testid={`badge-radius-${r.meters}`}
                >
                  {r.label} ({r.meters} m)
                </Badge>
              ))}
            </div>
            <p>
              The default view shows the ½-mile radius — roughly the area a
              parent and child would walk to and from school. Premium users can
              switch between all four radii to see how the picture changes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              How the 0–100 Score Is Calculated
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <div>
              <h3 className="font-semibold mb-1">1. Time window</h3>
              <p>
                We count complaints from the rolling last 12 months ending at
                the most recent monthly sync. We also count the prior 12-month
                window so we can show a trend.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">2. Severity weighting</h3>
              <p className="mb-2">
                Not all incidents carry the same parental concern. We weight
                each complaint by its severity:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  Violent felony (e.g., robbery, felony assault, sex crimes,
                  homicide): weight ×{SAFETY_OFFENSE_WEIGHTS.violentFelony}
                </li>
                <li>
                  Other felony: weight ×{SAFETY_OFFENSE_WEIGHTS.felony}
                </li>
                <li>
                  Misdemeanor: weight ×{SAFETY_OFFENSE_WEIGHTS.misdemeanor}
                </li>
                <li>
                  Violation: weight ×{SAFETY_OFFENSE_WEIGHTS.violation}
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-1">3. Density adjustment</h3>
              <p>
                The total weighted incidents are divided by the area of the
                radius (in square kilometers) to produce a{" "}
                <em>weighted risk score</em>. This stops larger radii from
                automatically looking riskier.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">4. Citywide percentile</h3>
              <p>
                We rank every school's weighted risk score against every other
                school in NYC at the same radius. The Safety Index is then{" "}
                <span className="font-mono">100 − risk percentile</span>, so a
                school in the safest decile scores ~90, while a school in the
                highest-activity decile scores ~10.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">5. Plain-English label</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>80–100 = Excellent</li>
                <li>60–79 = Above Average</li>
                <li>40–59 = Average</li>
                <li>20–39 = Below Average</li>
                <li>0–19 = Elevated Activity</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-1">6. Trend</h3>
              <p>
                We compare the current 12-month total to the prior 12-month
                total. A change of more than ±10% is labeled "improving" or
                "worsening"; otherwise the trend is "stable". When fewer than
                10 incidents fall in either window we show "insufficient
                data".
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What This Score Is Not</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>
              The Safety Index measures <em>reported</em> activity in the area
              around a school. It does <strong>not</strong> measure incidents
              inside the school building, school discipline, or how the school
              itself handles safety. For school-building safety culture see the
              NYC School Survey results on each school's page.
            </p>
            <p>
              Reporting practices vary across neighborhoods, and complaint
              counts include incidents involving non-residents (commuters,
              visitors, etc.). Use this score as one signal among many.
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
