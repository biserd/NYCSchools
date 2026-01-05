import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnMount: false, // Don't refetch on every component mount
    refetchOnWindowFocus: true, // Still refetch when user returns to tab (security)
    staleTime: 1000 * 30, // Cache for 30 seconds to reduce duplicate calls
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
  };
}
