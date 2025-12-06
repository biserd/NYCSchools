import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-foreground mb-3">Explore</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors" data-testid="footer-link-home">
                  Browse Schools
                </Link>
              </li>
              <li>
                <Link href="/map" className="hover:text-foreground transition-colors" data-testid="footer-link-map">
                  Map View
                </Link>
              </li>
              <li>
                <Link href="/compare" className="hover:text-foreground transition-colors" data-testid="footer-link-compare">
                  Compare Schools
                </Link>
              </li>
              <li>
                <Link href="/favorites" className="hover:text-foreground transition-colors" data-testid="footer-link-favorites">
                  My Favorites
                </Link>
              </li>
              <li>
                <Link href="/early-childhood" className="hover:text-foreground transition-colors" data-testid="footer-link-early-childhood">
                  Early Childhood Centers
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground mb-3">Tools</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/recommendations" className="hover:text-foreground transition-colors" data-testid="footer-link-recommendations">
                  Find My Match
                </Link>
              </li>
              <li>
                <Link href="/lottery-simulator" className="hover:text-foreground transition-colors" data-testid="footer-link-lottery">
                  Lottery Simulator
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-foreground transition-colors" data-testid="footer-link-settings">
                  Settings
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground mb-3">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/blog" className="hover:text-foreground transition-colors" data-testid="footer-link-blog">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-foreground transition-colors" data-testid="footer-link-faq">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-foreground transition-colors" data-testid="footer-link-features">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/benefits" className="hover:text-foreground transition-colors" data-testid="footer-link-benefits">
                  Benefits
                </Link>
              </li>
              <li>
                <Link href="/release-notes" className="hover:text-foreground transition-colors" data-testid="footer-link-release-notes">
                  Release Notes
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground mb-3">Developers</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/developers" className="hover:text-foreground transition-colors" data-testid="footer-link-developers">
                  Developer Portal
                </Link>
              </li>
              <li>
                <Link href="/developers/docs" className="hover:text-foreground transition-colors" data-testid="footer-link-api-docs">
                  API Documentation
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground mb-3">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="footer-link-privacy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="footer-link-terms">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-foreground transition-colors" data-testid="footer-link-pricing">
                  Pricing
                </Link>
              </li>
              <li>
                <a href="mailto:hello@nycschoolsratings.com" className="hover:text-foreground transition-colors" data-testid="footer-link-contact">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>© 2025 NYC School Ratings</span>
          </div>
          <div className="text-xs text-center sm:text-right">
            Data from NYC Department of Education
          </div>
        </div>
      </div>
    </footer>
  );
}
