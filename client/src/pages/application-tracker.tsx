import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { format, formatDistanceToNow, isPast, isWithinInterval, addDays } from "date-fns";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { TrackedSchool, School } from "@shared/schema";
import { 
  BookmarkPlus, 
  Calendar, 
  CalendarClock, 
  CalendarCheck,
  Bell,
  BellOff,
  Edit,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  GraduationCap,
  ArrowRight,
  Plus,
  Lock
} from "lucide-react";

const statusOptions = [
  { value: "researching", label: "Researching", icon: FileText, color: "text-blue-600" },
  { value: "applied", label: "Applied", icon: CalendarCheck, color: "text-purple-600" },
  { value: "waitlisted", label: "Waitlisted", icon: Clock, color: "text-yellow-600" },
  { value: "accepted", label: "Accepted", icon: CheckCircle, color: "text-emerald-600" },
  { value: "enrolled", label: "Enrolled", icon: GraduationCap, color: "text-emerald-700" },
  { value: "rejected", label: "Rejected", icon: XCircle, color: "text-red-600" },
];

function getStatusBadge(status: string) {
  const option = statusOptions.find(o => o.value === status) || statusOptions[0];
  const Icon = option.icon;
  
  const colorMap: Record<string, string> = {
    researching: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    applied: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    waitlisted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    enrolled: "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  
  return (
    <Badge className={`${colorMap[status] || colorMap.researching} gap-1`}>
      <Icon className="h-3 w-3" />
      {option.label}
    </Badge>
  );
}

function getDeadlineStatus(date: Date | null) {
  if (!date) return null;
  
  const now = new Date();
  const dateObj = new Date(date);
  
  if (isPast(dateObj)) {
    return { status: "past", color: "text-muted-foreground", label: "Passed" };
  }
  
  if (isWithinInterval(dateObj, { start: now, end: addDays(now, 3) })) {
    return { status: "urgent", color: "text-red-600", label: "Urgent" };
  }
  
  if (isWithinInterval(dateObj, { start: now, end: addDays(now, 7) })) {
    return { status: "soon", color: "text-yellow-600", label: "Soon" };
  }
  
  return { status: "upcoming", color: "text-emerald-600", label: "Upcoming" };
}

interface TrackedSchoolWithSchool extends TrackedSchool {
  school?: School;
}

export default function ApplicationTracker() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editingSchool, setEditingSchool] = useState<TrackedSchoolWithSchool | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Check auth and subscription status
  const { data: user, isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });
  
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  const isPremium = (subscription as any)?.status === "active" && 
    ((subscription as any)?.plan === "premium" || (subscription as any)?.plan === "season_pass");

  // Fetch tracked schools
  const { data: trackedSchools, isLoading: trackedLoading, error: trackedError } = useQuery<TrackedSchool[]>({
    queryKey: ["/api/tracked-schools"],
    enabled: !!user && isPremium,
  });

  // Fetch all schools for enrichment
  const { data: allSchools } = useQuery<School[]>({
    queryKey: ["/api/schools"],
    enabled: !!trackedSchools && trackedSchools.length > 0,
  });

  // Enrich tracked schools with school data
  const enrichedTrackedSchools: TrackedSchoolWithSchool[] = (trackedSchools || []).map(ts => ({
    ...ts,
    school: allSchools?.find(s => s.dbn === ts.schoolDbn),
  }));

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<TrackedSchool> }) => {
      return apiRequest("PATCH", `/api/tracked-schools/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracked-schools"] });
      toast({ title: "School updated", description: "Your tracked school has been updated." });
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update tracked school.", variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (schoolDbn: string) => {
      return apiRequest("DELETE", `/api/tracked-schools/${schoolDbn}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracked-schools"] });
      toast({ title: "School removed", description: "School has been removed from your tracker." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove school.", variant: "destructive" });
    },
  });

  // Loading state
  if (authLoading || subLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <SEOHead 
          title="Application Tracker | NYC School Ratings"
          description="Track your NYC school applications, deadlines, tours, and open houses with our comprehensive application tracker."
          noindex
        />
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <SEOHead 
          title="Application Tracker | NYC School Ratings"
          description="Track your NYC school applications, deadlines, tours, and open houses with our comprehensive application tracker."
          noindex
        />
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-lg mx-auto text-center">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Lock className="h-6 w-6" />
                Sign In Required
              </CardTitle>
              <CardDescription>
                Please sign in to access the Application Tracker.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Not premium
  if (!isPremium) {
    return (
      <div className="flex flex-col min-h-screen">
        <SEOHead 
          title="Application Tracker | NYC School Ratings"
          description="Track your NYC school applications, deadlines, tours, and open houses with our comprehensive application tracker."
          noindex
        />
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-lg mx-auto text-center">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Lock className="h-6 w-6" />
                Premium Feature
              </CardTitle>
              <CardDescription>
                The Application Tracker is a Premium feature that helps you stay organized during the school admissions process.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>With the Application Tracker, you can:</p>
                <ul className="text-left space-y-1 pl-4">
                  <li className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    Track open houses and tour dates
                  </li>
                  <li className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    Get email reminders for important deadlines
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Keep notes on each school
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Track application status
                  </li>
                </ul>
              </div>
              <Button asChild className="w-full">
                <Link href="/pricing">
                  Upgrade to Premium
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Premium user - show tracker
  return (
    <div className="flex flex-col min-h-screen">
      <SEOHead 
        title="Application Tracker | NYC School Ratings"
        description="Track your NYC school applications, deadlines, tours, and open houses with our comprehensive application tracker."
        noindex
      />
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Application Tracker</h1>
          <p className="text-muted-foreground">Track schools, deadlines, and application status</p>
        </div>
        <Button asChild>
          <Link href="/">
            <Plus className="mr-2 h-4 w-4" />
            Add Schools
          </Link>
        </Button>
      </div>

      {trackedLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : trackedError ? (
        <Card className="text-center py-8">
          <CardContent>
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">Failed to load tracked schools. Please try again.</p>
          </CardContent>
        </Card>
      ) : enrichedTrackedSchools.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <BookmarkPlus className="h-16 w-16 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">No Schools Tracked Yet</h3>
              <p className="text-muted-foreground">
                Start tracking schools to organize your application process.
              </p>
            </div>
            <Button asChild>
              <Link href="/">Browse Schools</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {enrichedTrackedSchools.map((tracked) => {
            const deadlineStatus = getDeadlineStatus(tracked.applicationDeadline);
            const tourStatus = getDeadlineStatus(tracked.tourDate);
            const openHouseStatus = getDeadlineStatus(tracked.openHouseDate);
            
            return (
              <Card key={tracked.id} className="hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Link href={`/schools/${tracked.schoolDbn}`}>
                        <CardTitle className="text-lg hover:text-primary transition-colors cursor-pointer truncate">
                          {tracked.school?.name || tracked.schoolDbn}
                        </CardTitle>
                      </Link>
                      {tracked.school && (
                        <CardDescription className="text-sm">
                          District {tracked.school.district} | {tracked.school.grade_band}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(tracked.status || "researching")}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingSchool(tracked);
                          setIsEditDialogOpen(true);
                        }}
                        data-testid={`button-edit-${tracked.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(tracked.schoolDbn)}
                        data-testid={`button-delete-${tracked.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {tracked.applicationDeadline && (
                      <div className={`flex items-center gap-2 text-sm ${deadlineStatus?.color}`}>
                        <CalendarClock className="h-4 w-4" />
                        <span>
                          Deadline: {format(new Date(tracked.applicationDeadline), "MMM d, yyyy")}
                          {deadlineStatus?.status === "urgent" && (
                            <Badge variant="destructive" className="ml-2 text-xs">Urgent</Badge>
                          )}
                        </span>
                        {tracked.notifyDeadline && <Bell className="h-3 w-3" />}
                      </div>
                    )}
                    {tracked.tourDate && (
                      <div className={`flex items-center gap-2 text-sm ${tourStatus?.color}`}>
                        <Calendar className="h-4 w-4" />
                        <span>Tour: {format(new Date(tracked.tourDate), "MMM d, yyyy")}</span>
                        {tracked.notifyTour && <Bell className="h-3 w-3" />}
                      </div>
                    )}
                    {tracked.openHouseDate && (
                      <div className={`flex items-center gap-2 text-sm ${openHouseStatus?.color}`}>
                        <CalendarCheck className="h-4 w-4" />
                        <span>Open House: {format(new Date(tracked.openHouseDate), "MMM d, yyyy")}</span>
                        {tracked.notifyOpenHouse && <Bell className="h-3 w-3" />}
                      </div>
                    )}
                  </div>
                  {tracked.notes && (
                    <div className="mt-3 text-sm text-muted-foreground bg-muted/50 rounded p-2">
                      {tracked.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Tracked School</DialogTitle>
            <DialogDescription>
              Update your tracking details for {editingSchool?.school?.name || editingSchool?.schoolDbn}
            </DialogDescription>
          </DialogHeader>
          
          {editingSchool && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                updateMutation.mutate({
                  id: editingSchool.id,
                  updates: {
                    status: formData.get("status") as string,
                    notes: formData.get("notes") as string,
                    applicationDeadline: formData.get("applicationDeadline") ? new Date(formData.get("applicationDeadline") as string) : null,
                    tourDate: formData.get("tourDate") ? new Date(formData.get("tourDate") as string) : null,
                    openHouseDate: formData.get("openHouseDate") ? new Date(formData.get("openHouseDate") as string) : null,
                    notifyDeadline: formData.get("notifyDeadline") === "on",
                    notifyTour: formData.get("notifyTour") === "on",
                    notifyOpenHouse: formData.get("notifyOpenHouse") === "on",
                  },
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="status">Application Status</Label>
                <Select name="status" defaultValue={editingSchool.status || "researching"}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className={`h-4 w-4 ${option.color}`} />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="applicationDeadline">Application Deadline</Label>
                  <Input
                    type="date"
                    name="applicationDeadline"
                    defaultValue={editingSchool.applicationDeadline ? format(new Date(editingSchool.applicationDeadline), "yyyy-MM-dd") : ""}
                    data-testid="input-deadline"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      name="notifyDeadline"
                      defaultChecked={editingSchool.notifyDeadline ?? true}
                      data-testid="switch-notify-deadline"
                    />
                    <Label className="text-xs text-muted-foreground">Email reminder</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tourDate">Tour Date</Label>
                  <Input
                    type="date"
                    name="tourDate"
                    defaultValue={editingSchool.tourDate ? format(new Date(editingSchool.tourDate), "yyyy-MM-dd") : ""}
                    data-testid="input-tour"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      name="notifyTour"
                      defaultChecked={editingSchool.notifyTour ?? true}
                      data-testid="switch-notify-tour"
                    />
                    <Label className="text-xs text-muted-foreground">Email reminder</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openHouseDate">Open House Date</Label>
                  <Input
                    type="date"
                    name="openHouseDate"
                    defaultValue={editingSchool.openHouseDate ? format(new Date(editingSchool.openHouseDate), "yyyy-MM-dd") : ""}
                    data-testid="input-openhouse"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      name="notifyOpenHouse"
                      defaultChecked={editingSchool.notifyOpenHouse ?? true}
                      data-testid="switch-notify-openhouse"
                    />
                    <Label className="text-xs text-muted-foreground">Email reminder</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  name="notes"
                  defaultValue={editingSchool.notes || ""}
                  placeholder="Add any notes about this school..."
                  rows={3}
                  data-testid="input-notes"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      </main>
      <Footer />
    </div>
  );
}
