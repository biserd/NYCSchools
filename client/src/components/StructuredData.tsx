import { useEffect, useRef } from 'react';

interface StructuredDataProps {
  data: object;
}

let scriptIdCounter = 0;

export function StructuredData({ data }: StructuredDataProps) {
  const scriptIdRef = useRef<string>(`structured-data-${++scriptIdCounter}`);
  
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    script.id = scriptIdRef.current;
    
    document.head.appendChild(script);

    return () => {
      const existingScript = document.getElementById(scriptIdRef.current);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [data]);

  return null;
}
