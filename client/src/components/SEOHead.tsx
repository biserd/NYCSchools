import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  canonicalPath?: string;
  noindex?: boolean;
}

const DEFAULT_TITLE = 'NYC Kindergarten School Finder';
const DEFAULT_DESCRIPTION = 'Find and compare NYC public and charter elementary schools. Browse 1,500+ schools with ratings, test scores, demographics, and parent reviews to make informed kindergarten enrollment decisions.';
const DEFAULT_KEYWORDS = 'NYC schools, kindergarten, elementary schools, public schools, charter schools, school ratings, school finder, New York City education, school comparison, parent reviews';
const DEFAULT_OG_IMAGE = 'https://nyc-kindergarten-school-finder.replit.app/og-image.png';
const SITE_URL = 'https://nyc-kindergarten-school-finder.replit.app';

export function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  canonicalPath,
  noindex = false,
}: SEOHeadProps) {
  const [location] = useLocation();
  const createdElementsRef = useRef<Set<HTMLElement>>(new Set());
  
  const fullTitle = title ? `${title} | ${DEFAULT_TITLE}` : DEFAULT_TITLE;
  const canonicalUrl = canonicalPath 
    ? `${SITE_URL}${canonicalPath}`
    : `${SITE_URL}${location}`;

  useEffect(() => {
    document.title = fullTitle;

    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
        createdElementsRef.current.add(element);
      }
      
      element.setAttribute('content', content);
    };

    const setLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
        createdElementsRef.current.add(element);
      }
      
      element.setAttribute('href', href);
    };

    setMetaTag('description', description);
    setMetaTag('keywords', keywords);
    
    if (noindex) {
      setMetaTag('robots', 'noindex, nofollow');
    } else {
      setMetaTag('robots', 'index, follow');
    }

    setMetaTag('og:title', fullTitle, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:type', ogType, true);
    setMetaTag('og:url', canonicalUrl, true);
    setMetaTag('og:image', ogImage, true);
    setMetaTag('og:site_name', DEFAULT_TITLE, true);

    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', fullTitle);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', ogImage);

    setLinkTag('canonical', canonicalUrl);

    return () => {
      createdElementsRef.current.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
      createdElementsRef.current.clear();
    };
  }, [fullTitle, description, keywords, ogImage, ogType, canonicalUrl, noindex]);

  return null;
}
