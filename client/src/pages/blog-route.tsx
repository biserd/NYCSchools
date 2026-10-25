import { lazy } from "react";
import { Redirect } from "wouter";
import { getSurveyInsight } from "@shared/survey-insights";
import NotFound from "./not-found";

const SurveyInsightPage = lazy(() => import("./survey-insight"));
const BlogPostPage = lazy(() => import("./blog-post"));

// Article content is only needed on blog routes, not during homepage startup.
// App's route Suspense boundary also handles these nested lazy components.
export default function BlogRoute({ slug, legacy = false }: { slug: string; legacy?: boolean }) {
  const insight = getSurveyInsight(slug);
  if (legacy) return insight ? <Redirect to={`/blog/${slug}`} replace /> : <NotFound />;
  return insight ? <SurveyInsightPage /> : <BlogPostPage />;
}
