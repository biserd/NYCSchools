import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ComparisonProvider } from "@/contexts/ComparisonContext";
import { CompareBar } from "@/components/CompareBar";
import { ChatBot } from "@/components/ChatBot";
import { Skeleton } from "@/components/ui/skeleton";
import SettingsPage from "@/pages/settings";
import PrivacyPage from "@/pages/privacy";
import TermsPage from "@/pages/terms";
import FAQPage from "@/pages/faq";
import FeaturesPage from "@/pages/features";
import BenefitsPage from "@/pages/benefits";
import ReleaseNotesPage from "@/pages/release-notes";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DevelopersPage from "@/pages/developers";
import ContactPage from "@/pages/contact";
import NotFound from "@/pages/not-found";

// Lazy load heavy route components to improve LCP and reduce initial bundle size
const Home = lazy(() => import("@/pages/home"));
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

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/">
          <Home />
        </Route>
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
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
