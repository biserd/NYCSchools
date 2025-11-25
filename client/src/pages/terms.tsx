import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { FileText } from "lucide-react";

export default function Terms() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead 
        title="Terms of Service"
        description="Read the terms and conditions for using NYC School Ratings. Understand your rights and responsibilities."
        keywords="terms of service, terms and conditions, user agreement, school ratings terms"
        canonicalPath="/terms"
      />
      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Terms of Service</h1>
        </div>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground mb-6">Last Updated: November 23, 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
            <p>
              By accessing or using NYC School Ratings, you agree to be bound by these Terms of Service. 
              If you disagree with any part of these terms, you may not use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Description of Service</h2>
            <p className="mb-4">
              NYC School Ratings is an informational platform that helps parents:
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
              To the maximum extent permitted by law, NYC School Ratings and its creators shall not 
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

        </div>
      </main>
      <Footer />
    </div>
  );
}
