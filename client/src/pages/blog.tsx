import { Link } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData } from "@/components/StructuredData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { blogPosts } from "@/lib/blog-data";
import { Calendar, Clock, ArrowRight, BarChart3 } from "lucide-react";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export default function BlogPage() {
  const blogListSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "NYC School Ratings Blog",
    "description": "Data-driven insights and analysis about NYC public and charter schools",
    "url": "https://nyc-school-ratings.replit.app/blog",
    "blogPost": blogPosts.map(post => ({
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.description,
      "datePublished": post.publishedAt,
      "author": {
        "@type": "Organization",
        "name": post.author
      }
    }))
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Blog - NYC School Ratings"
        description="Data-driven insights and analysis about NYC public and charter schools. Explore DOE data, district comparisons, and expert guidance for parents."
        canonicalPath="/blog"
      />
      <StructuredData data={blogListSchema} />

      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4" data-testid="heading-blog">
            NYC School Ratings Blog
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Data-driven insights and analysis to help you make informed decisions about NYC schools
          </p>
        </div>

        <div className="space-y-6">
          {blogPosts.map((post) => (
            <Card key={post.slug} className="hover-elevate transition-all" data-testid={`blog-card-${post.slug}`}>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{post.category}</Badge>
                  <div className="flex items-center text-sm text-muted-foreground gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(post.publishedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {post.readTime}
                    </span>
                  </div>
                </div>
                <CardTitle className="text-2xl">
                  <Link href={`/blog/${post.slug}`} className="hover:text-primary transition-colors" data-testid={`link-title-${post.slug}`}>
                    {post.title}
                  </Link>
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  {post.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {post.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" asChild className="gap-1">
                    <Link href={`/blog/${post.slug}`} data-testid={`link-read-${post.slug}`}>
                      Read Article
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {blogPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No blog posts yet. Check back soon!</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
