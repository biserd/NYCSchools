import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { LogIn, Loader2, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AuthPageHeader } from "@/components/AuthPageHeader";
import { SEOHead } from "@/components/SEOHead";
import { queryClient, apiRequest } from "@/lib/queryClient";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const magicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type LoginForm = z.infer<typeof loginSchema>;
type MagicLinkForm = z.infer<typeof magicLinkSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  
  // Get redirect URL from query params (sanitized to same-origin paths only)
  const params = new URLSearchParams(window.location.search);
  const rawRedirect = params.get("redirect") || "/";
  const redirectUrl = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/";
  
  // Check if magic link should be highlighted (from pricing/paywall pages)
  const highlightMagicLink = params.get("method") === "magic";
  const defaultTab = highlightMagicLink ? "magic-link" : "password";

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const magicLinkForm = useForm<MagicLinkForm>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/login", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      setLocation(redirectUrl);
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const magicLinkMutation = useMutation({
    mutationFn: async (data: MagicLinkForm) => {
      // Use form encoding for the passwordless flow. It avoids JSON body
      // transformations by browser/privacy tooling while remaining safely
      // parsed by Express's urlencoded middleware.
      const body = new URLSearchParams({
        email: data.email,
        returnTo: redirectUrl,
      });
      const response = await fetch("/api/auth/magic-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: body.toString(),
        credentials: "include",
        cache: "no-store",
      });

      const responseText = await response.text();
      let result: { message?: string } = {};
      if (responseText) {
        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error("The sign-in service returned an unexpected response.");
        }
      }
      if (!response.ok) {
        throw new Error(result.message || "Unable to request a sign-in link.");
      }
      return result;
    },
    onSuccess: () => {
      setMagicLinkSent(true);
      toast({
        title: "Check your email",
        description: "If an account exists, we've sent you a sign-in link.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Something went wrong",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onMagicLinkSubmit = (data: MagicLinkForm) => {
    magicLinkMutation.mutate(data);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead 
        title="Log In"
        description="Log in to NYC School Ratings to save your favorite schools and access personalized features."
        canonicalPath="/login"
        noindex
      />
      <AuthPageHeader title="Log In" />

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Choose how you'd like to sign in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="password" className="gap-2" data-testid="tab-password">
                  <KeyRound className="w-4 h-4" />
                  Password
                </TabsTrigger>
                <TabsTrigger value="magic-link" className="gap-2" data-testid="tab-magic-link">
                  <Mail className="w-4 h-4" />
                  Email Link
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="password">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="you@example.com" 
                              data-testid="input-email"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Password</FormLabel>
                            <Link href="/forgot-password" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                              Forgot password?
                            </Link>
                          </div>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter your password" 
                              data-testid="input-password"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginMutation.isPending}
                      data-testid="button-submit-login"
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4 mr-2" />
                          Log In
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="magic-link">
                {magicLinkSent ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="flex justify-center">
                      <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                        <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Check your email</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        We sent a sign-in link to <strong>{magicLinkForm.getValues('email')}</strong>
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      The link expires in 15 minutes. Check your spam folder if you don't see it.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setMagicLinkSent(false)}
                      data-testid="button-try-different-email"
                    >
                      Try a different email
                    </Button>
                  </div>
                ) : (
                  <Form {...magicLinkForm}>
                    <form onSubmit={magicLinkForm.handleSubmit(onMagicLinkSubmit)} className="space-y-4">
                      <FormField
                        control={magicLinkForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="you@example.com" 
                                data-testid="input-magic-email"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={magicLinkMutation.isPending}
                        data-testid="button-send-magic-link"
                      >
                        {magicLinkMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending link...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Sign-in Link
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        We'll email you a magic link for password-free sign in
                      </p>
                    </form>
                  </Form>
                )}
              </TabsContent>
            </Tabs>
            
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href={`/register${redirectUrl !== "/" ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`} className="text-primary hover:underline" data-testid="link-register">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
