import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  canonicalPath?: string;
  noindex?: boolean;
  appendSiteName?: boolean;
}

const SITE_NAME = 'NYC School Ratings';
const DEFAULT_DESCRIPTION = 'Compare NYC public, charter, private, and early-childhood schools using ratings, admissions context, programs, demographics, and parent reviews.';
const DEFAULT_OG_IMAGE = 'https://nycschoolsratings.com/og-image.jpg';
const SITE_URL = 'https://nycschoolsratings.com';

function cleanCanonicalPath(path: string): string {
  const clean = path.split('?')[0].split('#')[0] || '/';
  return clean.startsWith('/') ? clean : `/${clean}`;
}

export function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  canonicalPath,
  noindex = false,
  appendSiteName = true,
}: SEOHeadProps) {
  const [location] = useLocation();

  const titleAlreadyIncludesSite = title?.toLowerCase().includes(SITE_NAME.toLowerCase());
  const fullTitle = title
    ? (appendSiteName && !titleAlreadyIncludesSite ? `${title} | ${SITE_NAME}` : title)
    : SITE_NAME;
  const canonicalUrl = `${SITE_URL}${cleanCanonicalPath(canonicalPath ?? location)}`;

  useEffect(() => {
    const previousTitle = document.title;
    const touched: Array<{
      element: HTMLElement;
      attribute: 'content' | 'href';
      previousValue: string | null;
      created: boolean;
    }> = [];

    document.title = fullTitle;

    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      const matches = Array.from(
        document.querySelectorAll(`meta[${attribute}="${name}"]`),
      ) as HTMLMetaElement[];
      const element = matches.shift() ?? document.createElement('meta');
      const created = !element.parentNode;

      matches.forEach((duplicate) => duplicate.remove());
      if (created) {
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }

      touched.push({
        element,
        attribute: 'content',
        previousValue: created ? null : element.getAttribute('content'),
        created,
      });
      element.setAttribute('content', content);
    };

    const setCanonical = (href: string) => {
      const matches = Array.from(
        document.querySelectorAll('link[rel="canonical"]'),
      ) as HTMLLinkElement[];
      const element = matches.shift() ?? document.createElement('link');
      const created = !element.parentNode;

      matches.forEach((duplicate) => duplicate.remove());
      if (created) {
        element.setAttribute('rel', 'canonical');
        document.head.appendChild(element);
      }

      touched.push({
        element,
        attribute: 'href',
        previousValue: created ? null : element.getAttribute('href'),
        created,
      });
      element.setAttribute('href', href);
    };

    document.querySelectorAll('meta[name="keywords"]').forEach((element) => element.remove());

    setMetaTag('description', description);
    setMetaTag('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    setMetaTag('og:title', fullTitle, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:type', ogType, true);
    setMetaTag('og:url', canonicalUrl, true);
    setMetaTag('og:image', ogImage, true);
    setMetaTag('og:site_name', SITE_NAME, true);

    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:url', canonicalUrl);
    setMetaTag('twitter:title', fullTitle);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', ogImage);

    setCanonical(canonicalUrl);

    return () => {
      document.title = previousTitle;
      touched.reverse().forEach(({ element, attribute, previousValue, created }) => {
        if (created) {
          element.remove();
        } else if (previousValue == null) {
          element.removeAttribute(attribute);
        } else {
          element.setAttribute(attribute, previousValue);
        }
      });
    };
  }, [fullTitle, description, ogImage, ogType, canonicalUrl, noindex]);

  return null;
}
