import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ComparisonProvider } from "@/contexts/ComparisonContext";
import { ChatBot } from "@/components/ChatBot";
import { CompareBar } from "@/components/CompareBar";
import Home from "@/pages/home";
import FavoritesPage from "@/pages/favorites";
import SchoolDetail from "@/pages/school-detail";
import RecommendationsPage from "@/pages/recommendations";
import MapPage from "@/pages/map";
import ComparePage from "@/pages/compare";
import SettingsPage from "@/pages/settings";
import PrivacyPage from "@/pages/privacy";
import TermsPage from "@/pages/terms";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/favorites" component={FavoritesPage} />
      <Route path="/recommendations" component={RecommendationsPage} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/map" component={MapPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/school/:dbn" component={SchoolDetail} />
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
