import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { AuthPageHeader } from "@/components/AuthPageHeader";
import { SEOHead } from "@/components/SEOHead";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { trackEvent } from "@/lib/analytics";
import { isFamilyPremiumRegistration, registrationRedirect } from "@/lib/checkout-intent";

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const familyPremiumIntent = isFamilyPremiumRegistration(window.location.search);
  const redirectUrl = registrationRedirect(window.location.search);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const { confirmPassword, ...registerData } = data;
      const response = await apiRequest("POST", "/api/register", {
        ...registerData,
        ...(familyPremiumIntent ? { planIntent: "family_premium" } : {}),
      });
      return response.json();
    },
    onSuccess: (newUser) => {
      trackEvent("sign_up", { method: "password", plan_intent: familyPremiumIntent ? "family_premium" : "free" });
      if (familyPremiumIntent) trackEvent("subscription_signup_completed", { plan: "family_premium" });
      // The session is already established by /api/register. Update the cached
      // account before rendering the checkout continuation page.
      queryClient.setQueryData(["/api/auth/user"], newUser);
      toast({
        title: "Account created!",
        description: "Welcome to NYC School Ratings.",
      });
      setLocation(redirectUrl);
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead 
        title="Create Account"
        description="Create a free NYC School Ratings account to save your favorite schools and access personalized features."
        canonicalPath="/register"
        noindex
      />
      <AuthPageHeader title="Create Account" />

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Create an Account</CardTitle>
            <CardDescription className="text-center">
              {familyPremiumIntent ? "Create your account, then continue to secure Family Premium checkout" : "Sign up to save your favorite schools and write reviews"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {familyPremiumIntent && <p className="mb-5 rounded-lg border border-teal-300 bg-teal-50 p-3 text-sm text-teal-950">Creating an account is free. Your $19.99/month subscription starts only if you confirm payment in Stripe Checkout.</p>}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John" 
                            data-testid="input-firstname"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Doe" 
                            data-testid="input-lastname"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Create a password" 
                          data-testid="input-password"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Confirm your password" 
                          data-testid="input-confirm-password"
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
                  disabled={registerMutation.isPending}
                  data-testid="button-submit-register"
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      {familyPremiumIntent ? "Create account and continue" : "Create Account"}
                    </>
                  )}
                </Button>
              </form>
            </Form>
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link href={`/login${redirectUrl !== "/" ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`} className="text-primary hover:underline" data-testid="link-login">
                Log in
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
