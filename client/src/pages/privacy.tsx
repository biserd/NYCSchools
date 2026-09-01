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
          <p className="text-sm text-muted-foreground mb-6">Last Updated: December 18, 2025</p>

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
              When you create an account using your email address, we collect:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Your name and email address</li>
              <li>Your encrypted account credentials and profile information</li>
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
            <h2 className="text-2xl font-semibold mb-4">Data Storage and Retention</h2>
            <p className="mb-4">
              Your data is stored securely in our database. We use industry-standard security measures to protect 
              your information. For users who are not logged in, certain data (like home address for commute calculations) 
              may be stored locally in your browser using localStorage.
            </p>
            <h3 className="text-xl font-semibold mb-2">Data Retention Policy</h3>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Account Data:</strong> Retained while your account is active and for up to 30 days after deletion request</li>
              <li><strong>Favorites and Reviews:</strong> Retained while your account is active; deleted when you delete your account</li>
              <li><strong>AI Chat Sessions:</strong> Chat history with our AI assistant may be retained for up to 90 days for service improvement</li>
              <li><strong>OAuth Tokens:</strong> Access tokens expire after 1 hour; refresh tokens expire after 30 days</li>
              <li><strong>Payment Information:</strong> Handled and retained by Stripe according to their data retention policies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
            <p className="mb-4">We use the following third-party services:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Cloudflare:</strong> For application hosting and transactional email delivery</li>
              <li><strong>Google Maps APIs:</strong> For geocoding and transit time calculations</li>
              <li><strong>OpenAI:</strong> For AI-powered chat assistant and school recommendations</li>
              <li><strong>Stripe:</strong> For payment processing (subscription and one-time purchases)</li>
            </ul>
            <p>
              These services have their own privacy policies that govern their use of your data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">ChatGPT App Integration</h2>
            <p className="mb-4">
              NYC School Ratings is available as a ChatGPT app, allowing you to access school data directly within ChatGPT conversations. When you use our ChatGPT integration:
            </p>
            <h3 className="text-xl font-semibold mb-2">Data Accessed by ChatGPT</h3>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Public School Data:</strong> Academic scores, school profiles, and publicly available NYC school information</li>
              <li><strong>Your Favorites (if authenticated):</strong> If you connect your NYC School Ratings account to ChatGPT using OAuth, ChatGPT can access your saved favorite schools</li>
            </ul>
            <h3 className="text-xl font-semibold mb-2">OAuth Authorization</h3>
            <p className="mb-4">
              When you choose to connect your account to ChatGPT:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>You will be asked to sign in and authorize the connection</li>
              <li>ChatGPT receives limited access to view your favorite schools only</li>
              <li>ChatGPT cannot modify your account, add favorites, or access your payment information</li>
              <li>You can revoke this access at any time by logging into your account</li>
            </ul>
            <h3 className="text-xl font-semibold mb-2">Data Sent to OpenAI</h3>
            <p>
              When you use our ChatGPT app, your queries and the school data returned are processed by OpenAI according to their privacy policy. We do not control how OpenAI handles data within ChatGPT conversations.
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
              <li>Revoke OAuth access granted to third-party applications like ChatGPT</li>
            </ul>
            <h3 className="text-xl font-semibold mb-2">Data Deletion Requests</h3>
            <p className="mb-4">
              To request deletion of your data, please contact us at <a href="mailto:hello@nycschoolsratings.com" className="text-primary hover:underline">hello@nycschoolsratings.com</a>. 
              We will process deletion requests within 30 days and will:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Delete your account and profile information</li>
              <li>Remove your saved favorites and reviews</li>
              <li>Revoke all active OAuth tokens</li>
              <li>Delete your stored home address and preferences</li>
            </ul>
            <p>
              Note: We may retain certain data as required by law or for legitimate business purposes (e.g., fraud prevention, legal compliance).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Age Requirements and Children's Privacy</h2>
            <p className="mb-4">
              <strong>Minimum Age:</strong> This service is intended for users aged 13 and older. Users between 13-17 may use the service 
              with parental consent. This service is designed to help parents and guardians find schools for their children.
            </p>
            <p className="mb-4">
              We do not knowingly collect personal information from children under 13. If you are a parent and believe 
              your child under 13 has provided us with personal information, please contact us immediately at{" "}
              <a href="mailto:hello@nycschoolsratings.com" className="text-primary hover:underline">hello@nycschoolsratings.com</a> and 
              we will promptly delete the information.
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
            <p className="mb-4">
              If you have questions about this privacy policy, data requests, or wish to exercise your rights, please contact us:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Email:</strong> <a href="mailto:hello@nycschoolsratings.com" className="text-primary hover:underline">hello@nycschoolsratings.com</a></li>
              <li><strong>Website:</strong> <a href="/contact" className="text-primary hover:underline">nycschoolsratings.com/contact</a></li>
            </ul>
            <p>
              We will respond to your inquiry within a reasonable timeframe, typically within 7 business days.
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
