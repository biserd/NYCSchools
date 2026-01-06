import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Send, Sparkles, Star, Zap, ThumbsUp, ThumbsDown, Bot, User, RefreshCw, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useCheckout } from "@/hooks/useCheckout";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { School } from "@shared/schema";

interface Message {
  role: "user" | "assistant";
  content: string;
  id?: string;
  feedback?: "positive" | "negative" | null;
  suggestedQuestions?: string[];
}

// Animated typing indicator component
function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-2 animate-in fade-in duration-300" data-testid="thinking-indicator">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-muted rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-xs text-muted-foreground ml-1">AI is thinking...</span>
        </div>
      </div>
    </div>
  );
}

// Message bubble component with feedback
function MessageBubble({ 
  message, 
  index, 
  onFeedback,
  onSuggestedQuestion 
}: { 
  message: Message; 
  index: number;
  onFeedback?: (messageId: string, feedback: "positive" | "negative") => void;
  onSuggestedQuestion?: (question: string) => void;
}) {
  const isUser = message.role === "user";
  const messageId = message.id || `msg-${index}`;
  
  return (
    <div 
      className={`flex ${isUser ? "justify-end" : "items-start gap-2"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
      data-testid={`message-${message.role}-${index}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className="flex flex-col gap-2 max-w-[85%]">
        <div
          className={`rounded-lg px-4 py-2.5 ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
        
        {/* Feedback buttons for assistant messages */}
        {!isUser && message.content && onFeedback && (
          <div className="flex items-center gap-1 ml-1">
            <Button
              variant="ghost"
              size="icon"
              className={`h-6 w-6 ${message.feedback === "positive" ? "text-green-500 bg-green-500/10" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => onFeedback(messageId, "positive")}
              data-testid={`button-feedback-positive-${index}`}
              aria-label="Helpful response"
            >
              <ThumbsUp className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-6 w-6 ${message.feedback === "negative" ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => onFeedback(messageId, "negative")}
              data-testid={`button-feedback-negative-${index}`}
              aria-label="Not helpful response"
            >
              <ThumbsDown className="w-3 h-3" />
            </Button>
          </div>
        )}
        
        {/* Suggested follow-up questions */}
        {!isUser && message.suggestedQuestions && message.suggestedQuestions.length > 0 && onSuggestedQuestion && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {message.suggestedQuestions.map((question, qIndex) => (
              <Button
                key={qIndex}
                variant="outline"
                size="sm"
                className="h-auto py-1.5 px-2.5 text-xs font-normal whitespace-normal text-left hover-elevate"
                onClick={() => onSuggestedQuestion(question)}
                data-testid={`button-suggested-${index}-${qIndex}`}
              >
                {question}
              </Button>
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}

// Quick action chips for common questions
function QuickActions({ onSelect, currentSchool }: { onSelect: (question: string) => void; currentSchool?: School | null }) {
  const genericQuestions = [
    "What are the best schools in District 2?",
    "Compare G&T programs",
    "Find schools with strong math scores",
  ];
  
  const schoolSpecificQuestions = currentSchool ? [
    `How does ${currentSchool.name.split(' ').slice(0, 3).join(' ')} compare to nearby schools?`,
    "What programs does this school offer?",
    "Show me the test score trends",
  ] : genericQuestions;
  
  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b bg-muted/30" data-testid="quick-actions">
      {schoolSpecificQuestions.map((question, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="cursor-pointer hover-elevate text-xs font-normal py-1 px-2"
          onClick={() => onSelect(question)}
          data-testid={`badge-quick-action-${index}`}
        >
          {question.length > 35 ? question.substring(0, 35) + "..." : question}
        </Badge>
      ))}
    </div>
  );
}

export function ChatBot() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { startCheckout, isPending: checkoutPending } = useCheckout();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Check subscription status for premium gating
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

  const getInitialMessage = (): Message => {
    const content = currentSchool 
      ? `Hi! I'm your NYC School Ratings assistant. I see you're viewing ${currentSchool.name}. I can answer questions about this school's scores, programs, and how it compares to others. What would you like to know?`
      : "Hi! I'm your NYC School Ratings assistant. I can help you find schools, compare options, and answer questions about NYC public and charter schools. What would you like to know?";
    
    return {
      role: "assistant",
      content,
      id: "initial",
      suggestedQuestions: currentSchool 
        ? ["What are this school's test scores?", "How does it compare to nearby schools?", "What programs are offered?"]
        : ["Find top-rated elementary schools", "What's a good school in District 2?", "Compare G&T programs"],
    };
  };

  const [messages, setMessages] = useState<Message[]>([getInitialMessage()]);

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
        id: "initial",
        suggestedQuestions: ["Find top-rated elementary schools", "What's a good school in District 2?", "Compare G&T programs"],
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
        id: "initial",
        suggestedQuestions: ["What are this school's test scores?", "How does it compare to nearby schools?", "What programs are offered?"],
      }]);
      // Reset session for new school context
      setSessionId(null);
    }
  }, [currentSchool, currentSchoolDbn, prevSchoolDbn]);
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
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
  }, [messages, isLoading]);

  // Generate suggested questions based on the response
  const generateSuggestedQuestions = (response: string): string[] => {
    const lowerResponse = response.toLowerCase();
    const suggestions: string[] = [];
    
    if (lowerResponse.includes("test score") || lowerResponse.includes("proficiency")) {
      suggestions.push("How have scores changed over time?");
    }
    if (lowerResponse.includes("district")) {
      suggestions.push("What other schools are in this district?");
    }
    if (lowerResponse.includes("program") || lowerResponse.includes("g&t")) {
      suggestions.push("How competitive is admission?");
    }
    if (lowerResponse.includes("compare") || lowerResponse.includes("similar")) {
      suggestions.push("Which one would you recommend?");
    }
    if (currentSchool && !lowerResponse.includes(currentSchool.name.toLowerCase())) {
      suggestions.push(`Tell me more about ${currentSchool.name.split(' ').slice(0, 2).join(' ')}`);
    }
    
    // Add generic follow-ups if we don't have enough
    const genericFollowups = [
      "Can you explain more?",
      "What else should I consider?",
      "How do I apply?",
    ];
    
    while (suggestions.length < 2 && genericFollowups.length > 0) {
      suggestions.push(genericFollowups.shift()!);
    }
    
    return suggestions.slice(0, 3);
  };

  const sendMessage = async (messageToSend?: string) => {
    const userMessage = messageToSend || input.trim();
    if (!userMessage || isLoading || !isAuthenticated) return;

    setInput("");
    setShowQuickActions(false);
    
    // Add user message immediately with unique ID
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, { role: "user", content: userMessage, id: userMsgId }]);
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
      const assistantMsgId = `assistant-${Date.now()}`;

      if (reader) {
        // Add empty assistant message that we'll update
        setMessages((prev) => [...prev, { role: "assistant", content: "", id: assistantMsgId }]);

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
                      id: assistantMsgId,
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
        
        // Add suggested questions after response is complete
        const suggestions = generateSuggestedQuestions(assistantMessage);
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.role === "assistant") {
            lastMsg.suggestedQuestions = suggestions;
          }
          return newMessages;
        });
      }

      // Update session ID if we got a new one
      if (newSessionId) {
        setSessionId(newSessionId);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      
      const errorMessage = "Sorry, I encountered an error. Please try again.";
      
      setMessages((prev) => {
        // Remove the empty assistant message if it exists
        const filtered = prev.filter(m => m.content !== "" || m.role !== "assistant");
        return [
          ...filtered,
          {
            role: "assistant",
            content: errorMessage,
            id: `error-${Date.now()}`,
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (messageId: string, feedback: "positive" | "negative") => {
    setMessages((prev) => 
      prev.map((msg) => 
        msg.id === messageId ? { ...msg, feedback } : msg
      )
    );
    // Could send feedback to backend here for analytics
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleQuickAction = (question: string) => {
    setInput(question);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetConversation = () => {
    setMessages([getInitialMessage()]);
    setSessionId(null);
    setShowQuickActions(true);
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

  // Show upgrade prompt if not authenticated - AI chat is a premium feature
  if (!isAuthenticated && !authLoading) {
    return (
      <Card className="fixed bottom-6 right-6 w-96 h-auto shadow-2xl z-50 flex flex-col" data-testid="card-chat-upgrade">
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
              <h3 className="text-lg font-semibold">Unlock AI Assistant</h3>
              <p className="text-sm text-muted-foreground">
                Get personalized help finding the perfect school for your child. Our AI assistant can answer questions, compare schools, and provide recommendations.
              </p>
            </div>
            <Button 
              className="w-full bg-gradient-to-r from-primary to-primary/80" 
              onClick={startCheckout}
              disabled={checkoutPending}
              data-testid="button-chat-upgrade"
            >
              {checkoutPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Get Premium
            </Button>
            <p className="text-xs text-muted-foreground">
              One-time payment - 6 months of full access
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
          <ThinkingIndicator />
        </CardContent>
      </Card>
    );
  }

  // Show premium upgrade prompt for non-premium authenticated users
  if (isAuthenticated && subscriptionFetched && !isPremium) {
    return (
      <Card className="fixed bottom-6 right-6 w-96 h-auto shadow-2xl z-50 flex flex-col" data-testid="card-chat-premium-required">
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
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Star className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Premium Feature</h3>
              <p className="text-sm text-muted-foreground">
                Get unlimited access to our AI assistant. Ask questions about any school, compare options, and receive personalized recommendations.
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-left bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  <span>Unlimited AI questions</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Personalized school recommendations</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>Compare schools side-by-side</span>
                </div>
              </div>
              <Link href="/pricing">
                <Button className="w-full" data-testid="button-chat-upgrade">
                  <Star className="w-4 h-4 mr-2" />
                  Unlock for $29
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show loading state while checking subscription for authenticated users
  if (isAuthenticated && !subscriptionFetched) {
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
          <ThinkingIndicator />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col" data-testid="card-chat">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">AI School Assistant</CardTitle>
            <p className="text-xs text-muted-foreground">Powered by OpenAI</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={resetConversation}
            data-testid="button-chat-reset"
            aria-label="Reset conversation"
            title="Start new conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            data-testid="button-chat-close"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Quick action chips */}
        {showQuickActions && messages.length <= 1 && (
          <QuickActions onSelect={handleQuickAction} currentSchool={currentSchool} />
        )}
        
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef} data-testid="scroll-messages">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id || index}
                message={message}
                index={index}
                onFeedback={handleFeedback}
                onSuggestedQuestion={handleSuggestedQuestion}
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <ThinkingIndicator />
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-3 bg-background">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about schools..."
              className="min-h-[50px] max-h-[100px] resize-none text-sm"
              data-testid="input-chat-message"
              disabled={isLoading}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0 h-[50px] w-[50px]"
              data-testid="button-chat-send"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500" />
              Premium: Unlimited AI questions
            </p>
            <p className="text-xs text-muted-foreground">
              Press Enter to send
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
