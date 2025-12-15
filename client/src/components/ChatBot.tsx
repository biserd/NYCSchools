import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2, Sparkles, LogIn, Star, Zap } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useCheckout } from "@/hooks/useCheckout";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { School } from "@shared/schema";
import { UpgradeModal } from "@/components/UpgradeModal";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatBot() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { startCheckout, isLoading: checkoutLoading } = useCheckout();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const queryClient = useQueryClient();

  // Check subscription status - wait for query to complete before showing nudges
  const { data: subscription, isFetched: subscriptionFetched } = useQuery<{
    status: string;
    plan: string;
  }>({
    queryKey: ["/api/subscription"],
    enabled: isAuthenticated,
  });

  // Check for premium access - includes recurring subscriptions and Season Pass
  const isPremium = subscription?.status === "active" && 
    (subscription?.plan === "premium" || subscription?.plan === "season_pass");
  // Only show plan hints after subscription query completes
  const showPlanHint = subscriptionFetched;

  // Detect if we're on a school detail page and extract DBN
  const currentSchoolDbn = useMemo(() => {
    const schoolMatch = location.match(/^\/school\/([^/]+)/);
    if (schoolMatch) {
      return schoolMatch[1].split('-')[0].toUpperCase();
    }
    return null;
  }, [location]);

  // Fetch school data when on a school page - only run query when we have a DBN
  const { data: currentSchool } = useQuery<School>({
    queryKey: ["/api/schools", currentSchoolDbn],
    enabled: !!currentSchoolDbn,
  });

  const getInitialMessage = (): string => {
    if (currentSchool) {
      return `Hi! I'm your NYC School Ratings assistant. I see you're viewing ${currentSchool.name}. I can answer questions about this school's scores, programs, and how it compares to others. What would you like to know?`;
    }
    return "Hi! I'm your NYC School Ratings assistant. I can help you find schools, compare options, and answer questions about NYC public and charter schools. What would you like to know?";
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: getInitialMessage(),
    },
  ]);

  // Track previous school DBN to detect navigation
  const [prevSchoolDbn, setPrevSchoolDbn] = useState<string | null>(null);

  // Handle navigation between pages - reset context first to prevent stale data issues
  useEffect(() => {
    // Navigated away from school page - reset immediately before stale data can be used
    if (!currentSchoolDbn && prevSchoolDbn) {
      // Invalidate the old school query cache
      queryClient.removeQueries({ queryKey: ["/api/schools", prevSchoolDbn] });
      setPrevSchoolDbn(null);
      // Reset to generic greeting
      setMessages([{
        role: "assistant",
        content: "Hi! I'm your NYC School Ratings assistant. I can help you find schools, compare options, and answer questions about NYC public and charter schools. What would you like to know?",
      }]);
      setSessionId(null);
    }
  }, [currentSchoolDbn, prevSchoolDbn, queryClient]);

  // Handle navigation to a new school page - only after school data loads
  useEffect(() => {
    if (currentSchool && currentSchoolDbn && currentSchoolDbn !== prevSchoolDbn) {
      setPrevSchoolDbn(currentSchoolDbn);
      // Reset conversation with school-specific greeting
      setMessages([{
        role: "assistant",
        content: `Hi! I'm your NYC School Ratings assistant. I see you're viewing ${currentSchool.name}. I can answer questions about this school's scores, programs, and how it compares to others. What would you like to know?`,
      }]);
      // Reset session for new school context
      setSessionId(null);
    }
  }, [currentSchool, currentSchoolDbn, prevSchoolDbn]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !isAuthenticated) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message immediately
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Get conversation history (last 5 exchanges) - excluding the message we just added
      const conversationHistory = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory,
          sessionId,
          currentSchoolDbn,
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }
        console.error("Chat API error:", response.status, errorData);
        
        // Handle daily question limit
        if (response.status === 403 && errorData?.code === "AI_QUESTION_LIMIT_REACHED") {
          throw new Error("DAILY_LIMIT_REACHED");
        }
        
        throw new Error(`Failed to get response: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let newSessionId: number | null = null;

      if (reader) {
        // Add empty assistant message that we'll update
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.sessionId && !sessionId) {
                  newSessionId = parsed.sessionId;
                }
                if (parsed.content) {
                  assistantMessage += parsed.content;
                  // Update the last message (assistant) with accumulated content
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: "assistant",
                      content: assistantMessage,
                    };
                    return newMessages;
                  });
                } else if (parsed.error) {
                  console.error("Stream error:", parsed.error);
                  throw new Error(parsed.error);
                }
              } catch (e) {
                // Skip invalid JSON (SSE can send partial data)
                if (data && data !== "[DONE]") {
                  console.debug("Skipping invalid JSON:", data.substring(0, 50));
                }
              }
            }
          }
        }
      }

      // Update session ID if we got a new one
      if (newSessionId) {
        setSessionId(newSessionId);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      
      let errorMessage = "Sorry, I encountered an error. Please try again.";
      
      // Handle daily question limit
      if (error?.message === "DAILY_LIMIT_REACHED") {
        setLimitReached(true);
        errorMessage = "You've reached your daily AI question limit (5 questions/day for free accounts). Upgrade to Premium for unlimited questions!";
      }
      
      setMessages((prev) => {
        // Remove the empty assistant message if it exists
        const filtered = prev.filter(m => m.content !== "" || m.role !== "assistant");
        return [
          ...filtered,
          {
            role: "assistant",
            content: errorMessage,
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl z-50 bg-primary hover:bg-primary/90 animate-pulse hover:animate-none"
        data-testid="button-chat-open"
        aria-label="Open AI Assistant chat"
      >
        <MessageCircle className="w-7 h-7" />
      </Button>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated && !authLoading) {
    return (
      <Card className="fixed bottom-6 right-6 w-96 h-auto shadow-2xl z-50 flex flex-col" data-testid="card-chat-login">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-semibold">AI School Assistant</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            data-testid="button-chat-close"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Sign in to Chat</h3>
              <p className="text-sm text-muted-foreground">
                Get personalized help finding the perfect school for your child. Our AI assistant can answer questions, compare schools, and provide recommendations.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/login">
                <Button className="w-full" data-testid="button-chat-login">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" className="w-full" data-testid="button-chat-register">
                  Create Account
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Free to use - no credit card required
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <Card className="fixed bottom-6 right-6 w-96 h-auto shadow-2xl z-50 flex flex-col" data-testid="card-chat-loading">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-semibold">AI School Assistant</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            data-testid="button-chat-close"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col" data-testid="card-chat">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg font-semibold">AI School Assistant</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          data-testid="button-chat-close"
          aria-label="Close chat"
        >
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef} data-testid="scroll-messages">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`message-${message.role}-${index}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" data-testid="loader-chat" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          {limitReached ? (
            <div className="text-center space-y-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                  Daily limit reached! Upgrade for unlimited AI questions.
                </p>
                <Button 
                  onClick={() => setShowUpgradeModal(true)}
                  className="w-full"
                  data-testid="button-chat-upgrade"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Unlock Unlimited Questions
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about schools..."
                  className="min-h-[60px] max-h-[120px] resize-none"
                  data-testid="input-chat-message"
                  disabled={isLoading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="shrink-0"
                  data-testid="button-chat-send"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {showPlanHint && (
                isPremium ? (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500" />
                    Unlimited questions with Premium
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">
                    5 questions/day on Free plan{" "}
                    <Link href="/pricing" className="text-primary hover:underline">
                      Upgrade
                    </Link>
                  </p>
                )
              )}
              {!showPlanHint && (
                <p className="text-xs text-muted-foreground mt-2">
                  Ask me anything about NYC schools!
                </p>
              )}
            </>
          )}
        </div>
      </CardContent>
      
      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        trigger="ai_chat_limit"
      />
    </Card>
  );
}
