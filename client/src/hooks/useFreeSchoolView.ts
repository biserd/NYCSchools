import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const FREE_VIEW_STORAGE_KEY = "nyc_schools_free_view_dbn";

// Read localStorage synchronously to avoid race conditions
function getStoredFreeViewDbn(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(FREE_VIEW_STORAGE_KEY);
}

interface FreeViewData {
  freeViewSchoolDbn: string | null;
}

export function useFreeSchoolView(currentSchoolDbn: string) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  // Initialize from localStorage synchronously to prevent race conditions
  const [localFreeViewDbn, setLocalFreeViewDbn] = useState<string | null>(getStoredFreeViewDbn);
  // Track if we've already claimed to prevent duplicate claims
  const hasClaimedRef = useRef(false);

  // Fetch user's free view school from server (for logged-in users)
  const { data: serverFreeView, isLoading: serverLoading } = useQuery<FreeViewData>({
    queryKey: ["/api/user/free-view"],
    enabled: !authLoading && isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  // Mutation to set free view school on server
  const setFreeViewMutation = useMutation({
    mutationFn: async (dbn: string) => {
      return apiRequest("POST", "/api/user/free-view", { dbn });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/free-view"] });
    },
  });

  // Sync localStorage with server when user logs in
  useEffect(() => {
    if (isAuthenticated && !authLoading && localFreeViewDbn && !serverFreeView?.freeViewSchoolDbn) {
      // User just logged in and has a local free view but no server record
      // Transfer the local free view to their account
      setFreeViewMutation.mutate(localFreeViewDbn);
    }
  }, [isAuthenticated, authLoading, localFreeViewDbn, serverFreeView?.freeViewSchoolDbn]);

  // Get the effective free view DBN (server takes precedence for logged-in users)
  const freeViewDbn = isAuthenticated 
    ? serverFreeView?.freeViewSchoolDbn || localFreeViewDbn
    : localFreeViewDbn;

  // Check if this school is the user's free school
  // IMPORTANT: If no free view is set yet AND we're on a school page, this WILL BE the free school
  // (we're about to claim it in the useEffect below), so treat it as the free school now
  const isThisFreeSchool = freeViewDbn 
    ? freeViewDbn.toUpperCase() === currentSchoolDbn?.toUpperCase()
    : currentSchoolDbn ? true : false; // No free view yet = this school becomes the free school

  // Check if user has already used their free view on a different school
  const hasUsedFreeView = freeViewDbn !== null && !isThisFreeSchool;

  // Set this school as the free view school (if not already set)
  const claimFreeView = useCallback(() => {
    // Multiple guards to prevent re-claiming:
    // 1. Check ref (in-memory guard)
    if (hasClaimedRef.current) {
      return;
    }
    // 2. Check state (component state guard)
    if (localFreeViewDbn) {
      return;
    }
    // 3. Check localStorage directly (persistence guard)
    const existingDbn = getStoredFreeViewDbn();
    if (existingDbn) {
      // Sync state from localStorage if somehow out of sync
      setLocalFreeViewDbn(existingDbn);
      return;
    }

    hasClaimedRef.current = true;
    const dbn = currentSchoolDbn.toUpperCase();
    
    // Always save to localStorage (works for anonymous and syncs on login)
    localStorage.setItem(FREE_VIEW_STORAGE_KEY, dbn);
    setLocalFreeViewDbn(dbn);

    // If logged in, also save to server
    if (isAuthenticated) {
      setFreeViewMutation.mutate(dbn);
    }
  }, [currentSchoolDbn, localFreeViewDbn, isAuthenticated, setFreeViewMutation]);

  // Auto-claim on first visit if no free view is set
  useEffect(() => {
    // Skip if already claimed or if state shows existing free view
    if (hasClaimedRef.current || localFreeViewDbn) {
      return;
    }
    // Read from localStorage directly to ensure we have the latest value
    const existingDbn = getStoredFreeViewDbn();
    if (existingDbn) {
      // Sync state from localStorage
      setLocalFreeViewDbn(existingDbn);
      return;
    }
    if (!authLoading && !serverLoading && currentSchoolDbn) {
      claimFreeView();
    }
  }, [authLoading, serverLoading, currentSchoolDbn, localFreeViewDbn, claimFreeView]);

  const isLoading = authLoading || (isAuthenticated && serverLoading);

  return {
    freeViewDbn,
    isThisFreeSchool,
    hasUsedFreeView,
    isLoading,
    claimFreeView,
  };
}
