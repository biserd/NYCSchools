import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, Search } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Page Not Found"
        description="The requested NYC School Ratings page could not be found."
        noindex
        canonicalPath="/404"
      />
      <AppHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-8 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Page not found</h1>
            <p className="mt-3 text-muted-foreground">
              This page may have moved, or the address may be incorrect. Search the school directory or return home.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <Button asChild className="min-h-11">
                <Link href="/"><Search className="w-4 h-4 mr-2" />Browse schools</Link>
              </Button>
              <Button asChild variant="outline" className="min-h-11">
                <Link href="/"><Home className="w-4 h-4 mr-2" />Return home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
