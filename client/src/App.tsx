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
import Home from "@/pages/home";
import FavoritesPage from "@/pages/favorites";
import SchoolDetail from "@/pages/school-detail";
import ComparePage from "@/pages/compare";
import SettingsPage from "@/pages/settings";
import PrivacyPage from "@/pages/privacy";
import TermsPage from "@/pages/terms";
import FAQPage from "@/pages/faq";
import FeaturesPage from "@/pages/features";
import ReleaseNotesPage from "@/pages/release-notes";
import BlogPage from "@/pages/blog";
import BlogPostPage from "@/pages/blog-post";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import NotFound from "@/pages/not-found";

// Lazy load heavy route components
const RecommendationsPage = lazy(() => import("@/pages/recommendations"));
const MapPage = lazy(() => import("@/pages/map"));

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
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/favorites" component={FavoritesPage} />
      <Route path="/recommendations">
        <Suspense fallback={<PageLoader />}>
          <RecommendationsPage />
        </Suspense>
      </Route>
      <Route path="/compare" component={ComparePage} />
      <Route path="/map">
        <Suspense fallback={<PageLoader />}>
          <MapPage />
        </Suspense>
      </Route>
      <Route path="/settings" component={SettingsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/faq" component={FAQPage} />
      <Route path="/features" component={FeaturesPage} />
      <Route path="/release-notes" component={ReleaseNotesPage} />
      <Route path="/blog" component={BlogPage} />
      <Route path="/blog/:slug" component={BlogPostPage} />
      <Route path="/school/:slug" component={SchoolDetail} />
      <Route component={NotFound} />
    </Switch>
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
