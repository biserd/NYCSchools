import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ArrowRight, Clock } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function MagicLinkPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ token: string }>();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'expired' | 'used'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  useEffect(() => {
    const verifyMagicLink = async () => {
      const token = params.token;
      
      if (!token) {
        setStatus('error');
        setErrorMessage('No magic link token found.');
        return;
      }
      
      try {
        const response = await fetch(`/api/auth/magic-link/${token}`, {
          credentials: 'include',
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          if (data.error?.includes('expired')) {
            setStatus('expired');
          } else if (data.error?.includes('already been used')) {
            setStatus('used');
          } else {
            setStatus('error');
            setErrorMessage(data.error || 'Invalid magic link');
          }
          return;
        }
        
        if (data.success) {
          setStatus('success');
          queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
          
          setTimeout(() => {
            navigate(data.redirectUrl || '/');
          }, 2000);
        }
      } catch (error: any) {
        console.error('Magic link verification error:', error);
        setStatus('error');
        setErrorMessage('Something went wrong. Please try again.');
      }
    };
    
    verifyMagicLink();
  }, [params.token, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          {status === 'verifying' && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              </div>
              <CardTitle className="text-2xl">Verifying Your Link...</CardTitle>
              <CardDescription>Please wait while we log you in</CardDescription>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <CardTitle className="text-2xl text-green-700 dark:text-green-400">
                Welcome Back!
              </CardTitle>
              <CardDescription className="text-base">
                You're now logged in. Redirecting you to browse schools...
              </CardDescription>
            </>
          )}
          
          {status === 'expired' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                  <Clock className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
              <CardTitle className="text-2xl">Link Expired</CardTitle>
              <CardDescription className="text-base">
                This magic link has expired. Please request a new one.
              </CardDescription>
            </>
          )}
          
          {status === 'used' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <CheckCircle2 className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <CardTitle className="text-2xl">Already Logged In</CardTitle>
              <CardDescription className="text-base">
                This link has already been used. You may already be logged in.
              </CardDescription>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
                  <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <CardTitle className="text-2xl">Invalid Link</CardTitle>
              <CardDescription className="text-base">
                {errorMessage || "This magic link is invalid or has expired."}
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent className="pt-6">
          {status === 'success' && (
            <div className="flex justify-center">
              <Button 
                onClick={() => navigate('/')}
                data-testid="button-browse-schools-now"
              >
                Browse Schools Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
          
          {(status === 'expired' || status === 'error') && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                If you need a new access link, please contact us or try logging in again.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  variant="outline"
                  onClick={() => navigate('/login')}
                  data-testid="button-go-to-login"
                >
                  Go to Login
                </Button>
                <Button 
                  onClick={() => navigate('/pricing')}
                  data-testid="button-view-pricing"
                >
                  View Pricing
                </Button>
              </div>
            </div>
          )}
          
          {status === 'used' && (
            <div className="flex flex-col gap-3 items-center">
              <Button 
                onClick={() => navigate('/')}
                data-testid="button-browse-schools-used"
              >
                Browse Schools
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                variant="ghost"
                onClick={() => navigate('/login')}
                className="text-sm"
                data-testid="link-not-logged-in"
              >
                Not logged in? Click here
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
