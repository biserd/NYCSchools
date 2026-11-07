import { lazy } from "react";
import { Redirect } from "wouter";
import { getSurveyInsight } from "@shared/survey-insights";
import { getScoreArticle } from "@shared/score-articles";
import NotFound from "./not-found";

const SurveyInsightPage = lazy(() => import("./survey-insight"));
const BlogPostPage = lazy(() => import("./blog-post"));
const ScoreArticlePage = lazy(() => import('./score-article'));

// Article content is only needed on blog routes, not during homepage startup.
// App's route Suspense boundary also handles these nested lazy components.
export default function BlogRoute({ slug, legacy = false }: { slug: string; legacy?: boolean }) {
  const insight = getSurveyInsight(slug);
  const scoreArticle = getScoreArticle(slug);
  if (legacy) return insight || scoreArticle ? <Redirect to={`/blog/${slug}`} replace /> : <NotFound />;
  return scoreArticle ? <ScoreArticlePage/> : insight ? <SurveyInsightPage /> : <BlogPostPage />;
}
