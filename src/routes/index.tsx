import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, ChevronRight, Trophy, Sparkles, Bell } from "lucide-react";
import { IsometricGym } from "@/components/IsometricGym";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Proofit — Home" },
      { name: "description", content: "Your gym, your streak, your next workout. Prove it." },
    ],
  }),
  component: Index,
});

function Index() {
  const streak = 12;
  const level = 3;
  const reputation = 84;
  const nextUnlock = { name: "Cardio Zone", progress: 62 };

  return (
    <div className="flex flex-col gap-6 px-5 pb-6 pt-12">
      <header className="flex items-center justify-between animate-fade-up">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Saturday</p>
          <h1 className="font-display text-2xl font-semibold">Hey, Alex</h1>
        </div>
        <button className="relative grid h-11 w-11 place-items-center rounded-full border border-border bg-surface-1">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-accent" />
        </button>
      </header>

      <div
        className="animate-fade-up rounded-3xl border border-border bg-gradient-hero p-5 shadow-card"
        style={{ animationDelay: "60ms" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-accent" fill="currentColor" />
            <span className="text-sm font-medium text-muted-foreground">Current streak</span>
          </div>
          <span className="text-xs text-muted-foreground">Best: 21d</span>
        </div>
        <div className="mt-1 flex items-end gap-2">
          <span className="font-display text-6xl font-bold leading-none">{streak}</span>
          <span className="mb-1.5 text-muted-foreground">days</span>
        </div>
        <div className="mt-4 flex gap-1.5">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className={`h-7 flex-1 rounded-md ${
                i < streak
                  ? "bg-accent shadow-glow"
                  : i === 12
                    ? "border border-dashed border-accent/40"
                    : "bg-surface-2"
              }`}
            />
          ))}
        </div>
      </div>

      <div
        className="animate-fade-up overflow-hidden rounded-3xl border border-border bg-surface-1 shadow-card"
        style={{ animationDelay: "120ms" }}
      >
        <IsometricGym level={level} />
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your gym</p>
            <h2 className="font-display text-lg font-semibold">Iron Garage · Lv {level}</h2>
          </div>
          <Link
            to="/gym"
            className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-accent/50"
          >
            Visit <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div
        className="grid grid-cols-2 gap-3 animate-fade-up"
        style={{ animationDelay: "180ms" }}
      >
        <StatCard
          label="Reputation"
          value={`${reputation}`}
          suffix="/100"
          icon={<Trophy className="h-4 w-4 text-accent" />}
        />
        <StatCard
          label="Next unlock"
          value={nextUnlock.name}
          progress={nextUnlock.progress}
          icon={<Sparkles className="h-4 w-4 text-accent" />}
        />
      </div>

      <div
        className="animate-fade-up rounded-3xl border border-border bg-surface-1 p-5 shadow-card"
        style={{ animationDelay: "240ms" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Next workout</p>
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
            Today · 6:30 PM
          </span>
        </div>
        <h3 className="mt-2 font-display text-xl font-semibold">Push Day · Chest & Triceps</h3>
        <p className="text-sm text-muted-foreground">Sweat Lab · 1.2 mi away</p>

        <Link
          to="/prove"
          className="group mt-4 flex items-center justify-between rounded-2xl bg-gradient-accent p-4 text-accent-foreground shadow-glow"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-70">Tap to start</p>
            <p className="font-display text-lg font-bold">PROVE IT</p>
          </div>
          <ChevronRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <Link
        to="/onboarding"
        className="mx-auto text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Replay onboarding
      </Link>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  progress,
  icon,
}: {
  label: string;
  value: string;
  suffix?: string;
  progress?: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-4 shadow-card">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-display text-xl font-semibold">{value}</span>
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {typeof progress === "number" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full bg-gradient-accent" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}