import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
  };
}
