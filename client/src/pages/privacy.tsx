import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead 
        title="Privacy Policy"
        description="Learn how NYC School Ratings protects your privacy and handles your personal information. Read our comprehensive privacy policy."
        keywords="privacy policy, data protection, user privacy, school ratings privacy"
        canonicalPath="/privacy"
      />
      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Privacy Policy</h1>
        </div>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground mb-6">Last Updated: November 23, 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
            <p>
              Welcome to NYC School Ratings. We are committed to protecting your privacy and ensuring 
              transparency about how we collect, use, and protect your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
            <h3 className="text-xl font-semibold mb-2">Account Information</h3>
            <p className="mb-4">
              When you create an account using Replit Authentication, we collect:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Your name and email address</li>
              <li>Profile information from your authentication provider</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">Usage Data</h3>
            <p className="mb-4">
              We collect information about how you use our service:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Schools you favorite or compare</li>
              <li>Reviews and ratings you submit</li>
              <li>Your home address (if you choose to save it for commute calculations)</li>
              <li>Search queries and filter preferences</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">Location Data</h3>
            <p className="mb-4">
              If you provide your home address for commute time calculations, we use Google Maps APIs to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Convert your address to geographic coordinates (geocoding)</li>
              <li>Calculate public transit times to schools</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
            <p className="mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide personalized school recommendations</li>
              <li>Save your favorite schools and comparisons</li>
              <li>Calculate commute times from your home address</li>
              <li>Display your reviews and ratings</li>
              <li>Improve our service and user experience</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data Storage</h2>
            <p className="mb-4">
              Your data is stored securely in our database. We use industry-standard security measures to protect 
              your information. For users who are not logged in, certain data (like home address for commute calculations) 
              may be stored locally in your browser using localStorage.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
            <p className="mb-4">We use the following third-party services:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Replit Auth:</strong> For user authentication</li>
              <li><strong>Google Maps APIs:</strong> For geocoding and transit time calculations</li>
              <li><strong>OpenAI:</strong> For AI-powered chat assistant and school recommendations</li>
            </ul>
            <p>
              These services have their own privacy policies that govern their use of your data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We only share data with 
              third-party services (listed above) as necessary to provide our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Access your personal data</li>
              <li>Update or correct your information</li>
              <li>Delete your account and associated data</li>
              <li>Opt out of certain data collection (e.g., not saving your home address)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
            <p>
              This service is designed to help parents find schools for their children. We do not knowingly collect 
              personal information from children under 13. If you are a parent and believe your child has provided 
              us with personal information, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes by posting 
              the new policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p>
              If you have questions about this privacy policy, please contact us through our support channels.
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
