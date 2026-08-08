import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, Loader2, ArrowRight, Sparkles, Shield, MessageSquare, GitCompareArrows } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { SEOHead } from "@/components/SEOHead";

export default function ThanksPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'awaiting_email' | 'error'>('verifying');
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  useEffect(() => {
    const verifySession = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      
      if (!sessionId) {
        if (user) {
          setVerificationStatus('success');
        } else {
          setVerificationStatus('error');
          setErrorMessage('No session ID found. Please check your email for the access link.');
        }
        return;
      }
      
      try {
        const response = await fetch(`/api/checkout/verify-session?session_id=${sessionId}`, {
          credentials: 'include',
        });
        
        const data = await response.json();
        
        if (response.status === 202) {
          setVerificationStatus('awaiting_email');
          setVerifiedEmail(data.email);
          return;
        }
        
        if (!response.ok) {
          throw new Error(data.error || 'Verification failed');
        }
        
        if (data.success) {
          setVerificationStatus('success');
          setVerifiedEmail(data.user?.email);
          queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        }
      } catch (error: any) {
        console.error('Session verification error:', error);
        setVerificationStatus('awaiting_email');
      }
    };
    
    verifySession();
  }, [user]);

  const benefits = [
    { icon: MessageSquare, title: "AI Chat Assistant", description: "Get personalized school recommendations" },
    { icon: GitCompareArrows, title: "Side-by-Side Comparison", description: "Compare up to 4 schools at once" },
    { icon: Sparkles, title: "Deep Dive Metrics", description: "Detailed score breakdowns and trends" },
    { icon: Shield, title: "Application Tracker", description: "Manage deadlines and documents" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Thank You" description="Payment confirmation." canonicalPath="/thanks" noindex />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            {verificationStatus === 'verifying' && (
              <>
                <div className="flex justify-center mb-4">
                  <Loader2 className="h-16 w-16 text-primary animate-spin" />
                </div>
                <CardTitle className="text-2xl">Setting Up Your Account...</CardTitle>
                <CardDescription>Please wait while we activate your Season Pass</CardDescription>
              </>
            )}
            
            {verificationStatus === 'success' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-green-700 dark:text-green-400">
                  You're All Set!
                </CardTitle>
                <CardDescription className="text-base">
                  Your Season Pass is now active. Enjoy full access to all premium features.
                </CardDescription>
              </>
            )}
            
            {verificationStatus === 'awaiting_email' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Mail className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Check Your Email!</CardTitle>
                <CardDescription className="text-base">
                  We've sent an access link to{" "}
                  {verifiedEmail && <strong>{verifiedEmail}</strong>}
                </CardDescription>
              </>
            )}
            
            {verificationStatus === 'error' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                    <Mail className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Check Your Email</CardTitle>
                <CardDescription className="text-base">
                  {errorMessage || "Please check your email for the access link to your account."}
                </CardDescription>
              </>
            )}
          </CardHeader>
          
          <CardContent className="pt-6">
            {verificationStatus === 'success' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {benefits.map((benefit, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-2 p-3 rounded-lg bg-muted/50"
                    >
                      <benefit.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{benefit.title}</p>
                        <p className="text-xs text-muted-foreground">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button 
                    onClick={() => navigate('/')}
                    className="flex-1"
                    data-testid="button-browse-schools"
                  >
                    Browse Schools
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/recommendations')}
                    className="flex-1"
                    data-testid="button-get-recommendations"
                  >
                    Get AI Recommendations
                  </Button>
                </div>
              </div>
            )}
            
            {(verificationStatus === 'awaiting_email' || verificationStatus === 'error') && (
              <div className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                  <p className="font-medium">What happens next?</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Check your email inbox (and spam folder)</li>
                    <li>Click the "Access NYC School Ratings" button in the email</li>
                    <li>You'll be automatically logged in - no password needed!</li>
                  </ol>
                </div>
                
                <p className="text-sm text-center text-muted-foreground">
                  Bookmark the email - you can use it anytime to log in.
                </p>
                
                <div className="flex justify-center">
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/')}
                    data-testid="button-return-home"
                  >
                    Return to Homepage
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground mt-6">
          Questions? Contact us at{" "}
          <a href="mailto:hello@nycschoolsratings.com" className="text-primary hover:underline">
            hello@nycschoolsratings.com
          </a>
        </p>
      </div>
    </div>
  );
}
