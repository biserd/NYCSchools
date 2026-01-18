import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type PrivateSchool, formatTuition, getTuitionRange, getSelectivityDisplay, getGradeRangeDisplay, getProgramEmphasisLabel, extractNcesIdFromSlug, getPrivateSchoolSlug } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData } from "@/components/StructuredData";
import { AppHeader } from "@/components/AppHeader";
import { PrivateSchoolMap } from "@/components/PrivateSchoolMap";
import {
  MapPin,
  Phone,
  Globe,
  ExternalLink,
  Users,
  GraduationCap,
  Building2,
  ArrowLeft,
  DollarSign,
  Calendar,
  Clock,
  BookOpen,
  Church,
  UserCheck,
  FileText,
  AlertCircle,
  CheckCircle,
  Mail,
} from "lucide-react";

export default function PrivateSchoolDetail() {
  const { slug } = useParams<{ slug: string }>();
  
  // Extract ncesId from SEO-friendly slug (e.g., "00921917-academy-of-st-joseph" -> "00921917")
  const ncesId = slug ? extractNcesIdFromSlug(slug) : undefined;

  const { data: school, isLoading, error } = useQuery<PrivateSchool>({
    queryKey: ["/api/private-schools", ncesId],
    enabled: !!ncesId,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Private School Not Found</h1>
          <p className="text-muted-foreground mb-4">
            We couldn't find the private school you're looking for.
          </p>
          <Link href="/private-schools">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Private Schools
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const pageTitle = `${school.name} | NYC Private School`;
  const pageDescription = `${school.name} is a private ${school.coedStatus === 'coed' ? 'coeducational' : school.coedStatus === 'male' ? "boys'" : "girls'"} school in ${school.borough || 'NYC'}${school.religiousAffiliation && school.religiousAffiliation !== 'Non-Religious' ? ` with ${school.religiousAffiliation} affiliation` : ''}. Grades ${getGradeRangeDisplay(school)}.`;

  const selectivityInfo = getSelectivityDisplay(school.admissionsSelectivity);
  
  const keywords = [
    school.name,
    "NYC private school",
    school.borough || "",
    school.religiousAffiliation || "",
    "private education",
    "New York City",
  ].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-background" data-testid="page-private-school-detail">
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        canonicalPath={`/private-school/${getPrivateSchoolSlug(school)}`}
        keywords={keywords}
      />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "School",
          name: school.name,
          address: {
            "@type": "PostalAddress",
            streetAddress: school.address,
            addressLocality: school.city,
            addressRegion: school.state,
            postalCode: school.zipCode || undefined,
          },
          telephone: school.phone || undefined,
          url: school.website || undefined,
        }}
      />
      <AppHeader />

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="mb-6">
          <Link href="/private-schools">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Private Schools
            </Button>
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
              Private School
            </Badge>
            {school.isReligious && school.religiousAffiliation && (
              <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                <Church className="w-3 h-3 mr-1" />
                {school.religiousAffiliation}
              </Badge>
            )}
            {school.coedStatus && school.coedStatus !== 'coed' && (
              <Badge variant="outline">
                {school.coedStatus === 'male' ? "All Boys" : "All Girls"}
              </Badge>
            )}
            {school.hasFinancialAid && (
              <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">
                <DollarSign className="w-3 h-3 mr-1" />
                Financial Aid Available
              </Badge>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-school-name">
            {school.name}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {school.borough || school.city}, NY {school.zipCode}
            </span>
            {school.gradesOffered && (
              <span className="flex items-center gap-1">
                <GraduationCap className="w-4 h-4" />
                Grades {getGradeRangeDisplay(school)}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <PrivateSchoolMap
              schoolName={school.name}
              latitude={school.latitude}
              longitude={school.longitude}
              address={school.address}
            />
            
            <Card data-testid="card-overview">
              <CardHeader>
                <CardTitle className="text-lg">School Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{school.enrollment || '—'}</div>
                    <div className="text-xs text-muted-foreground">Total Students</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{school.studentTeacherRatio ? `${school.studentTeacherRatio}:1` : '—'}</div>
                    <div className="text-xs text-muted-foreground">Student-Teacher Ratio</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{school.teachersFte ? Math.round(school.teachersFte) : '—'}</div>
                    <div className="text-xs text-muted-foreground">Teachers (FTE)</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{school.schoolYearDays || '—'}</div>
                    <div className="text-xs text-muted-foreground">School Days/Year</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-tuition">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Tuition & Financial Aid
                </CardTitle>
              </CardHeader>
              <CardContent>
                {school.tuitionElementary || school.tuitionMiddle || school.tuitionHigh ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {school.tuitionElementary && (
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Elementary</div>
                        <div className="text-xl font-bold">{formatTuition(school.tuitionElementary)}</div>
                      </div>
                    )}
                    {school.tuitionMiddle && (
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Middle School</div>
                        <div className="text-xl font-bold">{formatTuition(school.tuitionMiddle)}</div>
                      </div>
                    )}
                    {school.tuitionHigh && (
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">High School</div>
                        <div className="text-xl font-bold">{formatTuition(school.tuitionHigh)}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground mb-4">
                    <AlertCircle className="w-4 h-4" />
                    <span>Tuition information not available. Contact the school for details.</span>
                  </div>
                )}
                
                {school.hasFinancialAid !== null && (
                  <div className="flex items-center gap-2">
                    {school.hasFinancialAid ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Financial aid is available</span>
                        {school.financialAidPercent && (
                          <Badge variant="secondary" className="ml-2">
                            {school.financialAidPercent}% of students receive aid
                          </Badge>
                        )}
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">No financial aid program reported</span>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-admissions">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Admissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {school.admissionsSelectivity && (
                  <div className="flex items-center gap-2">
                    <Badge className={`bg-${selectivityInfo.color}-100 text-${selectivityInfo.color}-800`}>
                      {selectivityInfo.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{selectivityInfo.description}</span>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      Application Deadline: {school.applicationDeadline || 'Contact School'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {school.hasRollingAdmissions ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Rolling Admissions</span>
                      </>
                    ) : school.hasRollingAdmissions === false ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">No Rolling Admissions</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Rolling admissions: Unknown</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      Interview: {school.requiresInterview === true ? 'Required' : school.requiresInterview === false ? 'Not Required' : 'Contact School'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      Testing: {school.requiresTesting === true ? 'Required' : school.requiresTesting === false ? 'Not Required' : 'Contact School'}
                    </span>
                  </div>
                </div>
                
                {school.testingTypes && school.testingTypes.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground mr-2">Accepted Tests:</span>
                    {school.testingTypes.map((test, idx) => (
                      <Badge key={idx} variant="outline" className="mr-1">
                        {test}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {school.programEmphasis && school.programEmphasis.length > 0 && (
              <Card data-testid="card-programs">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Program Focus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {school.programEmphasis.map((emphasis, idx) => (
                      <Badge key={idx} variant="secondary">
                        {getProgramEmphasisLabel(emphasis)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {school.accreditation && school.accreditation.length > 0 && (
              <Card data-testid="card-accreditation">
                <CardHeader>
                  <CardTitle className="text-lg">Accreditation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {school.accreditation.map((acc, idx) => (
                      <Badge key={idx} variant="outline" className="border-blue-300 text-blue-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {acc}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card data-testid="card-contact">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                  <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-400">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Unclaimed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Profile Not Claimed</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        School administrators can claim this profile to update information.
                      </p>
                    </div>
                  </div>
                  <Link href="/contact">
                    <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Claim School Profile
                    </Button>
                  </Link>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Address</span>
                  </div>
                  <div className="text-sm">{school.address}</div>
                  <div className="text-sm">{school.city}, {school.state} {school.zipCode}</div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Phone</span>
                  </div>
                  <div className={school.phone ? "text-sm" : "text-sm text-muted-foreground italic"}>
                    {school.phone || "Not provided"}
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </div>
                  <div className="text-sm text-muted-foreground italic">Not provided</div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Website</span>
                  </div>
                  {school.website ? (
                    <a
                      href={school.website.startsWith('http') ? school.website : `https://${school.website}`}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Visit Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">Not provided</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {school.isReligious && (
              <Card data-testid="card-religious">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Church className="w-5 h-5" />
                    Religious Affiliation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Affiliation</div>
                      <div className="font-medium">{school.religiousAffiliation}</div>
                    </div>
                    {school.religiousOrientation && school.religiousOrientation !== school.religiousAffiliation && (
                      <div>
                        <div className="text-xs text-muted-foreground">Denomination</div>
                        <div className="font-medium">{school.religiousOrientation}</div>
                      </div>
                    )}
                    {school.networkAffiliation && (
                      <div>
                        <div className="text-xs text-muted-foreground">Network</div>
                        <div className="font-medium">{school.networkAffiliation}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card data-testid="card-school-details">
              <CardHeader>
                <CardTitle className="text-lg">School Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">School Type</span>
                  <span className="text-sm font-medium capitalize">{school.schoolType || 'Day School'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Gender</span>
                  <span className="text-sm font-medium capitalize">
                    {school.coedStatus === 'coed' ? 'Coeducational' : school.coedStatus === 'male' ? 'All Boys' : 'All Girls'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Extended Day</span>
                  <span className="text-sm font-medium">{school.hasExtendedDay ? 'Yes' : 'No'}</span>
                </div>
                {school.schoolDayMinutes && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">School Day</span>
                    <span className="text-sm font-medium">{Math.round(school.schoolDayMinutes / 60 * 10) / 10} hours</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Data Source</span>
                  <span className="text-sm text-muted-foreground">{school.dataSourceVersion}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
