import { Link, useLocation } from "@tanstack/react-router";
import { Home, CalendarDays, Dumbbell, Trophy, User } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/gym", label: "Gym", icon: Dumbbell },
  { to: "/progress", label: "Progress", icon: Trophy },
  { to: "/account", label: "Account", icon: User },
] as const;

const hiddenOn = ["/onboarding", "/prove"];

export function MobileShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const showNav = !hiddenOn.some((p) => location.pathname.startsWith(p));

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-background">
      <main className={cn("flex-1", showNav && "pb-24")}>{children}</main>
      {showNav && <BottomNav pathname={location.pathname} />}
    </div>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 px-4 pb-4 pt-2">
      <div className="flex items-center justify-between rounded-full border border-border bg-surface-2/90 px-3 py-2 backdrop-blur-xl shadow-card">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] font-medium transition-all",
                active ? "text-accent" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-all",
                  active && "bg-accent/15 shadow-glow",
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className="tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}