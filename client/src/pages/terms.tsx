import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";

export default function Terms() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Terms of Service</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground mb-6">Last Updated: November 23, 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
            <p>
              By accessing or using NYC Kindergarten School Finder, you agree to be bound by these Terms of Service. 
              If you disagree with any part of these terms, you may not use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Description of Service</h2>
            <p className="mb-4">
              NYC Kindergarten School Finder is an informational platform that helps parents:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Browse and compare NYC public and charter elementary schools</li>
              <li>View academic performance metrics and NYC School Survey results</li>
              <li>Calculate commute times to schools using public transit</li>
              <li>Read and write school reviews</li>
              <li>Get AI-powered school recommendations</li>
              <li>Save favorite schools for comparison</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data Sources and Accuracy</h2>
            <p className="mb-4">
              Our school data is sourced from publicly available NYC Department of Education data, including:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>NYC School Survey results</li>
              <li>NYC Open Data school location information</li>
              <li>Academic performance metrics</li>
            </ul>
            <p>
              <strong>Important:</strong> While we strive to provide accurate and up-to-date information, we cannot 
              guarantee the accuracy, completeness, or timeliness of all data. School information may change. 
              We recommend verifying critical information directly with schools or the NYC Department of Education.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">User Accounts</h2>
            <p className="mb-4">To use certain features (favorites, reviews, saved addresses), you must create an account. You agree to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">User-Generated Content</h2>
            <h3 className="text-xl font-semibold mb-2">Reviews and Ratings</h3>
            <p className="mb-4">When submitting reviews, you agree to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide honest and accurate information based on your experience</li>
              <li>Not post false, misleading, or defamatory content</li>
              <li>Not violate any laws or third-party rights</li>
              <li>Not include personal information about students, staff, or other individuals</li>
              <li>Respect intellectual property rights</li>
            </ul>
            <p>
              We reserve the right to remove any content that violates these terms or is otherwise inappropriate.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Prohibited Uses</h2>
            <p className="mb-4">You may not use this service to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Harass, abuse, or harm other users or schools</li>
              <li>Impersonate any person or entity</li>
              <li>Spam or submit automated requests</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Scrape or extract data using automated means</li>
              <li>Use the service for commercial purposes without permission</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
            <p className="mb-4">Our service integrates with:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Google Maps APIs:</strong> For commute time calculations (subject to Google's Terms of Service)</li>
              <li><strong>OpenAI:</strong> For AI assistant features (subject to OpenAI's Terms of Use)</li>
              <li><strong>Replit:</strong> For authentication and hosting</li>
            </ul>
            <p>
              Use of these third-party services is subject to their respective terms and privacy policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Disclaimers</h2>
            <p className="mb-4">
              <strong>No Enrollment Guarantee:</strong> This service provides information only. We do not manage 
              school enrollment, admissions, or waitlists. Enrollment decisions are made by the NYC Department of 
              Education and individual schools.
            </p>
            <p className="mb-4">
              <strong>No Professional Advice:</strong> The AI recommendations and other features are informational 
              tools and do not constitute professional educational consulting or advice.
            </p>
            <p>
              <strong>As-Is Service:</strong> The service is provided "as is" without warranties of any kind, 
              either express or implied.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, NYC Kindergarten School Finder and its creators shall not 
              be liable for any indirect, incidental, special, consequential, or punitive damages resulting from 
              your use or inability to use the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Intellectual Property</h2>
            <p className="mb-4">
              The service design, code, and original content are protected by copyright and other intellectual 
              property laws. You may not:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Copy, modify, or distribute our proprietary content without permission</li>
              <li>Reverse engineer or attempt to extract source code</li>
              <li>Remove or alter any copyright notices</li>
            </ul>
            <p>
              School data sourced from NYC Open Data is subject to NYC's open data license.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account and access to the service at any time, 
              without notice, for conduct that we believe violates these terms or is harmful to other users, us, 
              or third parties, or for any other reason.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
            <p>
              We may modify these terms at any time. Continued use of the service after changes constitutes 
              acceptance of the new terms. We will update the "Last Updated" date when changes are made.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
            <p>
              These terms are governed by the laws of the State of New York, without regard to conflict of law principles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact</h2>
            <p>
              For questions about these terms, please contact us through our support channels.
            </p>
          </section>

          <div className="mt-8 pt-8 border-t">
            <Link href="/">
              <Button variant="outline" data-testid="button-back-home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
