import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ChatBot } from "@/components/ChatBot";
import Home from "@/pages/home";
import FavoritesPage from "@/pages/favorites";
import SchoolDetail from "@/pages/school-detail";
import RecommendationsPage from "@/pages/recommendations";
import MapPage from "@/pages/map";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/favorites" component={FavoritesPage} />
      <Route path="/recommendations" component={RecommendationsPage} />
      <Route path="/map" component={MapPage} />
      <Route path="/school/:dbn" component={SchoolDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
          <ChatBot />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
