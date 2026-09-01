import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ArrowRight, Clock, Mail } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { SEOHead } from "@/components/SEOHead";

export default function MagicLinkCallbackPage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'expired' | 'used'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [returnTo, setReturnTo] = useState<string>('/account');
  
  useEffect(() => {
    const verifyMagicLink = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const returnToParam = params.get('returnTo');

      // Remove the one-time credential from the address bar and browser
      // history before making any network requests from this page.
      window.history.replaceState({}, document.title, window.location.pathname);
      
      if (returnToParam && returnToParam.startsWith('/') && !returnToParam.startsWith('//')) {
        setReturnTo(returnToParam);
      }
      
      if (!token) {
        setStatus('error');
        setErrorMessage('No magic link token found.');
        return;
      }
      
      try {
        const body = new URLSearchParams({ token });
        const response = await fetch('/api/auth/magic-link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: body.toString(),
          credentials: 'include',
          cache: 'no-store',
        });

        const responseText = await response.text();
        let data: {
          success?: boolean;
          error?: string;
          user?: {
            id: string;
            email: string;
            subscriptionStatus?: string | null;
            subscriptionPlan?: string | null;
          };
        } = {};
        if (responseText) {
          try {
            data = JSON.parse(responseText);
          } catch {
            throw new Error(`Unexpected sign-in response (${response.status})`);
          }
        }
        
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
          if (data.user) {
            // The callback response is authoritative: reflect the new session
            // immediately instead of waiting for a second auth request.
            queryClient.setQueryData(['/api/auth/user'], data.user);
          }
          queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
          
          // Use the sanitized returnTo from state (already validated), not raw query param
          const safeRedirect = returnToParam && returnToParam.startsWith('/') && !returnToParam.startsWith('//') 
            ? returnToParam 
            : '/account';
          
          setTimeout(() => {
            navigate(safeRedirect);
          }, 1500);
        }
      } catch (error: any) {
        console.error('Magic link verification error:', error);

        // A Worker or network interruption can happen after the server has
        // saved the session. Recover instead of showing a false failure.
        try {
          const sessionResponse = await fetch('/api/auth/user', {
            credentials: 'include',
            cache: 'no-store',
          });
          const currentUser = sessionResponse.ok ? await sessionResponse.json() : null;
          if (currentUser?.id) {
            setStatus('success');
            queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
            const safeRedirect = returnToParam && returnToParam.startsWith('/') && !returnToParam.startsWith('//')
              ? returnToParam
              : '/account';
            setTimeout(() => navigate(safeRedirect), 1500);
            return;
          }
        } catch (sessionError) {
          console.error('Magic link session recovery error:', sessionError);
        }

        setStatus('error');
        setErrorMessage('We could not complete sign-in. Please request a fresh link and try again.');
      }
    };
    
    verifyMagicLink();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SEOHead title="Signing In" description="Secure sign-in callback." canonicalPath="/auth/magic-link/callback" noindex />
      <Card className="max-w-md w-full border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          {status === 'verifying' && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              </div>
              <CardTitle className="text-2xl">Signing You In...</CardTitle>
              <CardDescription>Please wait while we verify your link</CardDescription>
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
                You're Signed In!
              </CardTitle>
              <CardDescription className="text-base">
                Redirecting you now...
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
                This sign-in link has expired. Please request a new one.
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
              <CardTitle className="text-2xl">Already Used</CardTitle>
              <CardDescription className="text-base">
                This sign-in link has already been used. You may already be logged in.
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
                {errorMessage || "This sign-in link is invalid or has expired."}
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent className="pt-6">
          {status === 'success' && (
            <div className="flex justify-center">
              <Button 
                onClick={() => navigate(returnTo)}
                data-testid="button-continue-now"
              >
                Continue Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
          
          {(status === 'expired' || status === 'error') && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Sign-in links expire after 15 minutes for security.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => navigate(`/login?redirect=${encodeURIComponent(returnTo)}`)}
                  data-testid="button-request-new-link"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Request New Link
                </Button>
              </div>
            </div>
          )}
          
          {status === 'used' && (
            <div className="flex flex-col gap-3 items-center">
              <Button 
                onClick={() => navigate(returnTo)}
                data-testid="button-continue-used"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                variant="ghost"
                onClick={() => navigate(`/login?redirect=${encodeURIComponent(returnTo)}`)}
                className="text-sm"
                data-testid="link-not-logged-in"
              >
                Not logged in? Get a new link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
