import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData } from "@/components/StructuredData";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

interface FAQItemProps {
  question: string;
  answer: string | JSX.Element;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mb-4" data-testid="faq-item">
        <CollapsibleTrigger className="w-full" data-testid="faq-question">
          <CardContent className="p-4 flex items-center justify-between hover-elevate cursor-pointer">
            <h3 className="text-lg font-semibold text-left">{question}</h3>
            <ChevronDown 
              className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 text-muted-foreground" data-testid="faq-answer">
            {typeof answer === 'string' ? <p>{answer}</p> : answer}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function FAQ() {
  const faqs: FAQItemProps[] = [
    {
      question: "What is the NYC Kindergarten School Finder?",
      answer: "The NYC Kindergarten School Finder is a comprehensive web application designed to help parents browse and compare NYC public and charter elementary schools. It provides detailed information about school performance, demographics, and quality metrics to help you make informed decisions about your child's education."
    },
    {
      question: "How is the Overall Score calculated?",
      answer: (
        <div>
          <p className="mb-2">The Overall Score is calculated using three components:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Test Proficiency (40%):</strong> Average of ELA and Math proficiency from grades 3-8 state tests</li>
            <li><strong>Climate Score (30%):</strong> NYC DOE metric measuring school environment based on surveys from students, teachers, and parents</li>
            <li><strong>Progress Score (30%):</strong> NYC DOE metric tracking year-over-year student academic growth</li>
          </ul>
        </div>
      )
    },
    {
      question: "What do the color-coded indicators mean?",
      answer: (
        <div>
          <p className="mb-2">Color indicators help you quickly assess school performance:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Green (90+):</strong> Outstanding - Exceeds expectations</li>
            <li><strong>Yellow (80-89):</strong> Strong performance</li>
            <li><strong>Amber (70-79):</strong> Average - Meets expectations</li>
            <li><strong>Red (&lt;70):</strong> Needs improvement</li>
          </ul>
        </div>
      )
    },
    {
      question: "What is the Economic Need Index (ENI)?",
      answer: "The Economic Need Index (ENI) represents the percentage of students at a school facing economic hardship. This includes students in temporary housing, those living in poverty based on census data, families receiving SNAP or TANF benefits, and recent immigrants. Schools with higher ENI receive additional funding and resources to support their students."
    },
    {
      question: "How does the commute time calculator work?",
      answer: "You can enter your home address in the settings or when viewing schools. We use Google Maps APIs to calculate public transit times and distances from your home to each school. Your address is saved locally in your browser and, if you're logged in, synced to your account for convenience."
    },
    {
      question: "Do I need to create an account to use the site?",
      answer: "No, you can browse schools, view details, calculate commute times, and use the AI assistant without an account. However, creating an account allows you to save favorite schools, write reviews, and get personalized recommendations."
    },
    {
      question: "How do I compare schools?",
      answer: "Click the 'Add to Compare' button on any school card or detail page. You can compare up to 4 schools side-by-side. Your comparison is saved automatically and you can access it from the Compare page at any time."
    },
    {
      question: "What is the AI Assistant?",
      answer: "Our AI Assistant is powered by OpenAI and can answer questions about schools, help you understand metrics, provide recommendations, and guide you through the school selection process. You can access it via the chat button on any page."
    },
    {
      question: "How do I get personalized school recommendations?",
      answer: "Visit the Recommendations page from the navigation menu. You'll answer a few questions about your priorities (academics, diversity, class size, etc.) and preferred districts. Our AI will then suggest schools that match your criteria."
    },
    {
      question: "Where does the school data come from?",
      answer: (
        <div>
          <p className="mb-2">We use official NYC Department of Education data from multiple sources:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Test Scores:</strong> NYC Open Data, grades 3-8 state test results (2021-22 to 2022-23 academic years)</li>
            <li><strong>Climate & Progress:</strong> NYC DOE School Survey and Quality Reports (2023-2024)</li>
            <li><strong>Demographics:</strong> NYC Open Data Portal, student demographics dataset c7ru-d68s (2021-22 to 2022-23 academic years)</li>
            <li><strong>School Locations:</strong> NYC Open Data School Point Locations</li>
          </ul>
          <p className="mt-2 text-sm">All data represents the most recent information available from official NYC DOE sources.</p>
        </div>
      )
    },
    {
      question: "How often is the data updated?",
      answer: "We update our school data when new information is released by the NYC Department of Education, typically annually. Our current data includes test scores and demographics from the 2021-22 to 2022-23 academic years, and school quality metrics (climate and progress scores) from 2023-2024."
    },
    {
      question: "Can I write reviews for schools?",
      answer: "Yes! If you have an account, you can write one review per school. You can rate schools on a 1-5 star scale and provide written feedback about your experience or observations."
    },
    {
      question: "What does 'Student-Teacher Ratio' mean?",
      answer: "The student-teacher ratio shows the average number of students per teacher at a school. For example, a 15:1 ratio means there are 15 students for every teacher. Lower ratios often indicate more individual attention for students."
    },
    {
      question: "Why don't some high schools have test scores?",
      answer: "The ELA and Math proficiency scores shown are from grades 3-8 state tests. High schools and schools that don't include these grades show a placeholder score (50%) since they don't administer these particular tests. High schools use different assessments."
    },
    {
      question: "How do I view schools on a map?",
      answer: "Click on the 'Map' link in the navigation menu to see all schools displayed on an interactive map. You can filter by district, click on markers to see school information, and view commute times if you've set your home address."
    },
    {
      question: "What are the demographics shown for each school?",
      answer: "For each school, we display the Economic Need Index (ENI), percentage of English Language Learners (ELL), percentage of students with Individualized Education Programs (IEPs), and a racial/ethnic diversity breakdown including Asian, Black, Hispanic/Latino, White, and Multi-Racial student percentages."
    },
    {
      question: "Is my data private and secure?",
      answer: (
        <div>
          <p>Yes, we take your privacy seriously. We use secure authentication, encrypt your data, and never sell your information to third parties. For more details, please see our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</p>
        </div>
      )
    }
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": typeof faq.answer === 'string' ? faq.answer : faq.question
      }
    }))
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead 
        title="FAQ - Frequently Asked Questions"
        description="Find answers to common questions about using the NYC Kindergarten School Finder, including how scores are calculated, data sources, and feature guides."
        keywords="NYC school finder FAQ, school ratings questions, NYC DOE data, kindergarten enrollment help, school comparison guide"
        canonicalPath="/faq"
      />
      <StructuredData data={faqSchema} />
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Frequently Asked Questions</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <p className="text-muted-foreground mb-8">
          Find answers to common questions about using the NYC Kindergarten School Finder.
        </p>

        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>

        <div className="mt-12 p-6 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Still have questions?</h2>
          <p className="text-muted-foreground mb-4">
            Our AI Assistant can help answer specific questions about schools or help you navigate the site.
          </p>
          <Button
            variant="default"
            onClick={() => {
              const chatButton = document.querySelector('[data-testid="button-chat-open"]') as HTMLButtonElement;
              if (chatButton) chatButton.click();
            }}
            data-testid="button-open-ai-assistant"
          >
            Ask the AI Assistant
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
