export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  author: string;
  publishedAt: string;
  readTime: string;
  category: string;
  featuredImage?: string;
  tags: string[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: "nyc-schools-2025-covid-recovery",
    title: "NYC Schools 2025: The COVID Recovery Story",
    description: "How NYC schools bounced back from pandemic learning loss. Our analysis of 2025 test scores reveals a remarkable recovery - with proficiency rates now exceeding pre-COVID levels.",
    author: "NYC School Ratings Team",
    publishedAt: "2024-12-09",
    readTime: "7 min read",
    category: "Data Analysis",
    tags: ["COVID Recovery", "2025 Test Scores", "NYC Schools", "NYSED Data", "Learning Loss"]
  },
  {
    slug: "2023-24-doe-data-analysis",
    title: "What 2023-24 NYC DOE Data Tells Us About School Education Quality",
    description: "A comprehensive analysis of NYC school performance data reveals significant disparities across districts, the impact of economic factors, and what parents should know when choosing a school.",
    author: "NYC School Ratings Team",
    publishedAt: "2024-11-26",
    readTime: "8 min read",
    category: "Data Analysis",
    tags: ["NYC Schools", "DOE Data", "Education Quality", "School Rankings", "2023-24"]
  }
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug);
}
