import { useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";
import type { SchoolWithOverallScore } from '@shared/schema';
import { generateSchoolFAQ, generateFAQStructuredData } from '@shared/faqGenerator';
import { StructuredData } from './StructuredData';

interface SchoolFAQProps {
  school: SchoolWithOverallScore;
}

function formatAnswerWithMarkdown(text: string): JSX.Element {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if (part.includes('\n\n')) {
          return part.split('\n\n').map((paragraph, pIndex) => (
            <span key={`${index}-${pIndex}`}>
              {pIndex > 0 && <><br /><br /></>}
              {paragraph}
            </span>
          ));
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

export function SchoolFAQ({ school }: SchoolFAQProps) {
  const faqData = useMemo(() => generateSchoolFAQ(school), [school]);
  const structuredData = useMemo(() => generateFAQStructuredData(school, faqData), [school, faqData]);

  return (
    <>
      <StructuredData data={structuredData} />
      <Card data-testid="card-faq">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqData.faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`faq-${index}`}
                data-testid={`faq-item-${index}`}
              >
                <AccordionTrigger 
                  className="text-left hover:no-underline"
                  data-testid={`faq-trigger-${index}`}
                >
                  <span className="font-medium">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent data-testid={`faq-content-${index}`}>
                  <div className="text-muted-foreground leading-relaxed pt-2">
                    {formatAnswerWithMarkdown(faq.answer)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="text-xs text-muted-foreground mt-4">
            Last updated: {faqData.lastUpdated}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
