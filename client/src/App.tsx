import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ComparisonProvider } from "@/contexts/ComparisonContext";
import { CompareBar } from "@/components/CompareBar";
import { ChatBot } from "@/components/ChatBot";
import { Skeleton } from "@/components/ui/skeleton";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

// Lazy-load every non-Home route so its JS + CSS split into separate chunks.
// Home stays eager so its LCP element ships in the initial bundle.
const SettingsPage = lazy(() => import("@/pages/settings"));
const PrivacyPage = lazy(() => import("@/pages/privacy"));
const TermsPage = lazy(() => import("@/pages/terms"));
const FAQPage = lazy(() => import("@/pages/faq"));
const FeaturesPage = lazy(() => import("@/pages/features"));
const BenefitsPage = lazy(() => import("@/pages/benefits"));
const ReleaseNotesPage = lazy(() => import("@/pages/release-notes"));
const LoginPage = lazy(() => import("@/pages/login"));
const RegisterPage = lazy(() => import("@/pages/register"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const DevelopersPage = lazy(() => import("@/pages/developers"));
const ContactPage = lazy(() => import("@/pages/contact"));
const FavoritesPage = lazy(() => import("@/pages/favorites"));
const SchoolDetail = lazy(() => import("@/pages/school-detail"));
const ComparePage = lazy(() => import("@/pages/compare"));
const BlogPage = lazy(() => import("@/pages/blog"));
const BlogPostPage = lazy(() => import("@/pages/blog-post"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const DevelopersDocsPage = lazy(() => import("@/pages/developers-docs"));
const RecommendationsPage = lazy(() => import("@/pages/recommendations"));
const MapPage = lazy(() => import("@/pages/map"));
const LotterySimulatorPage = lazy(() => import("@/pages/lottery-simulator"));
const ChancesCalculatorPage = lazy(() => import("@/pages/chances-calculator"));
const ApplicationTrackerPage = lazy(() => import("@/pages/application-tracker"));
const EarlyChildhoodPage = lazy(() => import("@/pages/early-childhood"));
const NyceecDetailPage = lazy(() => import("@/pages/nyceec-detail"));
const ThanksPage = lazy(() => import("@/pages/thanks"));
const MagicLinkPage = lazy(() => import("@/pages/magic-link"));
const MagicLinkCallbackPage = lazy(() => import("@/pages/magic-link-callback"));
const PrivateSchoolsPage = lazy(() => import("@/pages/private-schools"));
const PrivateSchoolDetailPage = lazy(() => import("@/pages/private-school-detail"));
const SafetyMethodologyPage = lazy(() => import("@/pages/safety-methodology"));
const SafeAndStrongPage = lazy(() => import("@/pages/safe-and-strong"));
const AdminApiUsagePage = lazy(() => import("@/pages/admin-api-usage"));

// Loading component for lazy routes
function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsPageView() {
  const [location] = useLocation();

  useEffect(() => {
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    gtag?.('event', 'page_view', {
      page_location: window.location.href,
      page_path: location,
      page_title: document.title,
    });
  }, [location]);

  return null;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/">
          <Home />
        </Route>
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/favorites">
          <FavoritesPage />
        </Route>
        <Route path="/application-tracker">
          <ApplicationTrackerPage />
        </Route>
        <Route path="/recommendations">
          <RecommendationsPage />
        </Route>
        <Route path="/compare">
          <ComparePage />
        </Route>
        <Route path="/compare/:schools">
          <ComparePage />
        </Route>
        <Route path="/map">
          <MapPage />
        </Route>
        <Route path="/lottery-simulator">
          <LotterySimulatorPage />
        </Route>
        <Route path="/chances-calculator">
          <ChancesCalculatorPage />
        </Route>
        <Route path="/early-childhood">
          <EarlyChildhoodPage />
        </Route>
        <Route path="/early-childhood/:slug">
          <NyceecDetailPage />
        </Route>
        <Route path="/private-schools">
          <PrivateSchoolsPage />
        </Route>
        <Route path="/private-school/:slug">
          <PrivateSchoolDetailPage />
        </Route>
        <Route path="/settings" component={SettingsPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/faq" component={FAQPage} />
        <Route path="/features" component={FeaturesPage} />
        <Route path="/benefits" component={BenefitsPage} />
        <Route path="/release-notes" component={ReleaseNotesPage} />
        <Route path="/blog">
          <BlogPage />
        </Route>
        <Route path="/blog/:slug">
          <BlogPostPage />
        </Route>
        <Route path="/pricing">
          <PricingPage />
        </Route>
        <Route path="/developers" component={DevelopersPage} />
        <Route path="/developers/docs">
          <DevelopersDocsPage />
        </Route>
        <Route path="/contact" component={ContactPage} />
        <Route path="/safety-methodology">
          <SafetyMethodologyPage />
        </Route>
        <Route path="/safe-and-strong">
          <SafeAndStrongPage />
        </Route>
        <Route path="/admin/api-usage">
          <AdminApiUsagePage />
        </Route>
        <Route path="/thanks">
          <ThanksPage />
        </Route>
        <Route path="/auth/magic-link/callback">
          <MagicLinkCallbackPage />
        </Route>
        <Route path="/auth/magic-link/:token">
          <MagicLinkPage />
        </Route>
        <Route path="/school/:slug">
          <SchoolDetail />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ComparisonProvider>
          <TooltipProvider>
            <Toaster />
            <AnalyticsPageView />
            <Router />
            <ChatBot />
            <CompareBar />
          </TooltipProvider>
        </ComparisonProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
