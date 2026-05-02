import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useCheckout } from "@/hooks/useCheckout";
import {
  Code,
  Copy,
  Check,
  Key,
  Zap,
  AlertTriangle,
  Star,
  Lock,
  Loader2,
  ArrowLeft,
  BookOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EndpointDoc {
  method: string;
  path: string;
  description: string;
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  response: string;
  example: string;
}

const endpoints: EndpointDoc[] = [
  {
    method: "GET",
    path: "/api/v1/schools",
    description: "Retrieve a list of all NYC schools with optional filtering and pagination.",
    parameters: [
      { name: "district", type: "string", required: false, description: "Filter by school district (e.g., '02', '15')" },
      { name: "grade_band", type: "string", required: false, description: "Filter by grade levels: 'elementary', 'middle', 'high'" },
      { name: "has_3k", type: "boolean", required: false, description: "Filter schools with 3-K programs" },
      { name: "has_prek", type: "boolean", required: false, description: "Filter schools with Pre-K programs" },
      { name: "has_gifted", type: "boolean", required: false, description: "Filter schools with G&T programs" },
      { name: "limit", type: "number", required: false, description: "Number of results per page (default: 50, max: 200)" },
      { name: "offset", type: "number", required: false, description: "Pagination offset" },
    ],
    response: `{
  "data": [
    {
      "dbn": "02M545",
      "name": "P.S. 545",
      "address": "123 Main St, New York, NY",
      "district": "02",
      "grades": "PK-5",
      "overallScore": 85,
      "testProficiency": 78,
      "climateScore": 92,
      "progressScore": 85,
      ...
    }
  ],
  "pagination": {
    "total": 1533,
    "limit": 50,
    "offset": 0
  }
}`,
    example: `curl -X GET "https://nycschoolsratings.com/api/v1/schools?district=2&limit=10" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  },
  {
    method: "GET",
    path: "/api/v1/schools/:dbn",
    description: "Get detailed information for a specific school by its DBN (District Borough Number).",
    parameters: [
      { name: "dbn", type: "string", required: true, description: "The school's unique DBN identifier (e.g., '02M545')" },
    ],
    response: `{
  "dbn": "02M545",
  "name": "P.S. 545",
  "address": "123 Main St, New York, NY",
  "district": "02",
  "borough": "Manhattan",
  "grades": "PK-5",
  "enrollment": 450,
  "overallScore": 85,
  "testProficiency": 78,
  "climateScore": 92,
  "progressScore": 85,
  "elaPercent": 72,
  "mathPercent": 68,
  "studentTeacherRatio": "12:1",
  "demographics": {...},
  "programs": {...},
  "surveyResults": {...}
}`,
    example: `curl -X GET "https://nycschoolsratings.com/api/v1/schools/02M545" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  },
  {
    method: "GET",
    path: "/api/v1/districts",
    description: "List all NYC school districts with aggregate statistics.",
    parameters: [],
    response: `{
  "data": [
    {
      "id": "02",
      "name": "District 2",
      "borough": "Manhattan",
      "schoolCount": 45,
      "avgOverallScore": 82,
      "avgTestProficiency": 75
    }
  ]
}`,
    example: `curl -X GET "https://nycschoolsratings.com/api/v1/districts" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  },
  {
    method: "GET",
    path: "/api/v1/early-childhood",
    description: "Retrieve NYC Early Education Centers (3-K and Pre-K). Supports filtering by borough (full name or letter code: M/X/K/Q/R), program_type, and center_type.",
    parameters: [
      { name: "borough", type: "string", required: false, description: "Filter by borough (e.g. 'Brooklyn' or 'K')" },
      { name: "program_type", type: "string", required: false, description: "Filter by program: '3k', 'prek', or 'both'" },
      { name: "center_type", type: "string", required: false, description: "Filter by center type: 'NYCEEC', 'DOE', or 'Charter'" },
      { name: "limit", type: "number", required: false, description: "Number of results (default: 50, max: 200)" },
    ],
    response: `{
  "data": [
    {
      "locCode": "XAPN",
      "name": "ABC Learning Center",
      "address": "456 Oak Ave, Brooklyn, NY",
      "borough": "Brooklyn",
      "programs": ["3-K", "Pre-K"],
      "seats": 60,
      "latitude": 40.7128,
      "longitude": -73.9352,
      "phone": "718-555-0123",
      "website": null
    }
  ]
}`,
    example: `curl -X GET "https://nycschoolsratings.com/api/v1/early-childhood?borough=Brooklyn" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  },
  {
    method: "GET",
    path: "/api/v1/trends/:dbn",
    description: "Get historical performance trends for a specific school (3-5 year data).",
    parameters: [
      { name: "dbn", type: "string", required: true, description: "The school's DBN identifier" },
    ],
    response: `{
  "dbn": "02M545",
  "direction": "improving",
  "changePercent": 8.5,
  "yearlyData": [
    { "year": "2021", "elaPercent": 65, "mathPercent": 62 },
    { "year": "2022", "elaPercent": 68, "mathPercent": 65 },
    { "year": "2023", "elaPercent": 72, "mathPercent": 68 }
  ]
}`,
    example: `curl -X GET "https://nycschoolsratings.com/api/v1/trends/02M545" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  },
];

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <pre className="bg-muted/50 border rounded-lg p-4 overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2"
        onClick={handleCopy}
        data-testid="button-copy-code"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}

export default function DevelopersDocsPage() {
  const { user } = useAuth();
  const { startCheckout, isLoading: checkoutLoading, isPremium } = useCheckout();

  const { data: subscription } = useQuery<{
    status: string;
    plan: string;
  }>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  const hasApiAccess = isPremium || subscription?.plan === "premium";

  return (
    <>
      <SEOHead
        title="API Documentation | NYC School Ratings"
        description="Complete API documentation for NYC School Ratings. Learn how to authenticate, explore endpoints, and integrate school data into your applications."
        canonicalPath="/developers/docs"
      />
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />

        <main className="flex-1">
          <div className="container mx-auto px-4 max-w-6xl py-8">
            <div className="mb-8">
              <Link href="/developers">
                <Button variant="ghost" size="sm" className="mb-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Developer Portal
                </Button>
              </Link>
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-8 h-8 text-primary" />
                <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-docs-title">
                  API Documentation
                </h1>
              </div>
              <p className="text-muted-foreground text-lg">
                Everything you need to integrate NYC school data into your applications.
              </p>
            </div>

            {!hasApiAccess && (
              <Card className="mb-8 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        API Access Required
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Subscribe to Premium to get your API key and start building.
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={startCheckout}
                    disabled={checkoutLoading}
                    data-testid="button-unlock-api"
                  >
                    {checkoutLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Star className="w-4 h-4 mr-2" />
                    )}
                    Unlock API Access
                  </Button>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="authentication" className="space-y-8">
              <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
                <TabsTrigger value="authentication" data-testid="tab-authentication">
                  <Key className="w-4 h-4 mr-2" />
                  Authentication
                </TabsTrigger>
                <TabsTrigger value="endpoints" data-testid="tab-endpoints">
                  <Code className="w-4 h-4 mr-2" />
                  Endpoints
                </TabsTrigger>
                <TabsTrigger value="rate-limits" data-testid="tab-rate-limits">
                  <Zap className="w-4 h-4 mr-2" />
                  Rate Limits
                </TabsTrigger>
                <TabsTrigger value="errors" data-testid="tab-errors">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Errors
                </TabsTrigger>
              </TabsList>

              <TabsContent value="authentication" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>API Authentication</CardTitle>
                    <CardDescription>
                      All API requests require authentication using a Bearer token.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-3">Getting Your API Key</h3>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        <li>Subscribe to the Premium plan ($4.99/month)</li>
                        <li>Go to your Settings page</li>
                        <li>Navigate to the "API Access" section</li>
                        <li>Click "Generate API Key" to create your key</li>
                      </ol>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Using Your API Key</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Include your API key in the Authorization header of every request:
                      </p>
                      <CodeBlock
                        code={`curl -X GET "https://nycschoolsratings.com/api/v1/schools" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                      />
                    </div>

                    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-200">
                            Keep Your API Key Secure
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            Never expose your API key in client-side code or public repositories. 
                            Use environment variables and server-side requests.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="endpoints" className="space-y-6">
                {endpoints.map((endpoint, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline" 
                          className="font-mono bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        >
                          {endpoint.method}
                        </Badge>
                        <code className="text-lg font-mono">{endpoint.path}</code>
                      </div>
                      <CardDescription className="mt-2">
                        {endpoint.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {endpoint.parameters && endpoint.parameters.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3">Parameters</h4>
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="text-left p-3 font-medium">Name</th>
                                  <th className="text-left p-3 font-medium">Type</th>
                                  <th className="text-left p-3 font-medium">Required</th>
                                  <th className="text-left p-3 font-medium">Description</th>
                                </tr>
                              </thead>
                              <tbody>
                                {endpoint.parameters.map((param, pIndex) => (
                                  <tr key={pIndex} className="border-t">
                                    <td className="p-3 font-mono text-xs">{param.name}</td>
                                    <td className="p-3 text-muted-foreground">{param.type}</td>
                                    <td className="p-3">
                                      {param.required ? (
                                        <Badge variant="secondary" className="text-xs">Required</Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">Optional</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-muted-foreground">{param.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="font-semibold mb-3">Example Request</h4>
                        <CodeBlock code={endpoint.example} />
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3">Response</h4>
                        <CodeBlock code={endpoint.response} language="json" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="rate-limits" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Rate Limits</CardTitle>
                    <CardDescription>
                      API rate limits help ensure fair usage and service stability.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold">Premium Plan</h3>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex justify-between">
                            <span>Requests per minute:</span>
                            <span className="font-medium text-foreground">60</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Requests per day:</span>
                            <span className="font-medium text-foreground">10,000</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Requests per month:</span>
                            <span className="font-medium text-foreground">300,000</span>
                          </li>
                        </ul>
                      </div>
                      <div className="p-4 rounded-lg border bg-muted/30">
                        <h3 className="font-semibold mb-2">Rate Limit Headers</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Every response includes headers to track your usage:
                        </p>
                        <CodeBlock
                          code={`X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1699574400`}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/30 border">
                      <h3 className="font-semibold mb-2">Exceeding Rate Limits</h3>
                      <p className="text-sm text-muted-foreground">
                        If you exceed the rate limit, you'll receive a <code className="bg-muted px-1 rounded">429 Too Many Requests</code> response. 
                        Wait until the reset time indicated in the headers before making more requests.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="errors" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Error Handling</CardTitle>
                    <CardDescription>
                      The API uses standard HTTP status codes and returns detailed error messages.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-3">HTTP Status Codes</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3 font-medium">Code</th>
                              <th className="text-left p-3 font-medium">Status</th>
                              <th className="text-left p-3 font-medium">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t">
                              <td className="p-3 font-mono">200</td>
                              <td className="p-3 text-emerald-600">OK</td>
                              <td className="p-3 text-muted-foreground">Request successful</td>
                            </tr>
                            <tr className="border-t">
                              <td className="p-3 font-mono">400</td>
                              <td className="p-3 text-amber-600">Bad Request</td>
                              <td className="p-3 text-muted-foreground">Invalid parameters or request body</td>
                            </tr>
                            <tr className="border-t">
                              <td className="p-3 font-mono">401</td>
                              <td className="p-3 text-red-600">Unauthorized</td>
                              <td className="p-3 text-muted-foreground">Missing or invalid API key</td>
                            </tr>
                            <tr className="border-t">
                              <td className="p-3 font-mono">403</td>
                              <td className="p-3 text-red-600">Forbidden</td>
                              <td className="p-3 text-muted-foreground">API access not enabled for this account</td>
                            </tr>
                            <tr className="border-t">
                              <td className="p-3 font-mono">404</td>
                              <td className="p-3 text-amber-600">Not Found</td>
                              <td className="p-3 text-muted-foreground">Resource not found</td>
                            </tr>
                            <tr className="border-t">
                              <td className="p-3 font-mono">429</td>
                              <td className="p-3 text-amber-600">Too Many Requests</td>
                              <td className="p-3 text-muted-foreground">Rate limit exceeded</td>
                            </tr>
                            <tr className="border-t">
                              <td className="p-3 font-mono">500</td>
                              <td className="p-3 text-red-600">Internal Error</td>
                              <td className="p-3 text-muted-foreground">Server error - please try again</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Error Response Format</h3>
                      <CodeBlock
                        code={`{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Invalid district parameter. Expected format: two-digit number.",
    "details": {
      "parameter": "district",
      "provided": "invalid",
      "expected": "01-32"
    }
  }
}`}
                        language="json"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
