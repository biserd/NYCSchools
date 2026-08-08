import { useEffect } from 'react';

interface StructuredDataProps {
  data: object;
}

export function StructuredData({ data }: StructuredDataProps) {
  useEffect(() => {
    const schemaType = String((data as Record<string, unknown>)['@type'] ?? 'Thing');
    const candidates = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    ) as HTMLScriptElement[];
    let script = candidates.find(
      (candidate) => candidate.dataset.schemaType === schemaType,
    );

    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.schemaType = schemaType;
      document.head.appendChild(script);
    }

    script.dataset.seoManaged = 'client';
    script.text = JSON.stringify(data).replace(/</g, '\\u003c');

    return () => {
      script?.remove();
    };
  }, [data]);

  return null;
}
