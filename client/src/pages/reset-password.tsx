import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, KeyRound, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SEOHead } from "@/components/SEOHead";
import { apiRequest } from "@/lib/queryClient";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [resetComplete, setResetComplete] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const { data: tokenStatus, isLoading: validating } = useQuery({
    queryKey: ["/api/auth/password-reset/validate", token],
    queryFn: async () => {
      if (!token) return { valid: false, message: "No reset token provided" };
      const response = await fetch(`/api/auth/password-reset/validate?token=${encodeURIComponent(token)}`);
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: ResetPasswordForm) => {
      const response = await apiRequest("POST", "/api/auth/password-reset/complete", {
        token,
        password: data.password,
      });
      return response.json();
    },
    onSuccess: () => {
      setResetComplete(true);
      toast({
        title: "Password Reset",
        description: "Your password has been reset successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResetPasswordForm) => {
    resetMutation.mutate(data);
  };

  if (!token) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <SEOHead 
          title="Reset Password"
          description="Reset your NYC School Ratings password."
          canonicalPath="/reset-password"
          noindex
        />
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Reset Password</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center">Invalid Link</CardTitle>
              <CardDescription className="text-center">
                No reset token was provided. Please request a new password reset link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/forgot-password">
                <Button className="w-full" data-testid="button-request-new-link">
                  Request New Reset Link
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (validating) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <SEOHead 
          title="Reset Password"
          description="Reset your NYC School Ratings password."
          canonicalPath="/reset-password"
          noindex
        />
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Reset Password</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="py-8 flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Validating your reset link...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!tokenStatus?.valid) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <SEOHead 
          title="Reset Password"
          description="Reset your NYC School Ratings password."
          canonicalPath="/reset-password"
          noindex
        />
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Reset Password</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center">Link Expired</CardTitle>
              <CardDescription className="text-center">
                {tokenStatus?.message || "This password reset link is no longer valid."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/forgot-password">
                <Button className="w-full" data-testid="button-request-new-link">
                  Request New Reset Link
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (resetComplete) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <SEOHead 
          title="Password Reset"
          description="Your password has been reset successfully."
          canonicalPath="/reset-password"
          noindex
        />
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Password Reset</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center">Password Updated!</CardTitle>
              <CardDescription className="text-center">
                Your password has been reset successfully. You can now log in with your new password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full" data-testid="button-go-to-login">
                  Go to Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead 
        title="Reset Password"
        description="Create a new password for your NYC School Ratings account."
        canonicalPath="/reset-password"
        noindex
      />
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Reset Password</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Create New Password</CardTitle>
            <CardDescription className="text-center">
              Enter your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter new password" 
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
                          placeholder="Confirm new password" 
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
                  disabled={resetMutation.isPending}
                  data-testid="button-reset-password"
                >
                  {resetMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 mr-2" />
                      Reset Password
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
