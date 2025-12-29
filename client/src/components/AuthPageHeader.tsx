import { Link } from "wouter";
import { Home } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AuthPageHeaderProps {
  title: string;
}

export function AuthPageHeader({ title }: AuthPageHeaderProps) {
  return (
    <header className="border-b bg-card" data-testid="header-auth">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
        <div className="flex items-center gap-4">
          <Link href="/">
            <div className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
              <Home className="w-5 h-5 text-primary" />
              <span className="text-lg font-semibold hidden sm:inline" data-testid="text-site-title">
                NYC School Ratings
              </span>
            </div>
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-xl font-bold" data-testid="text-page-title">{title}</h1>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
