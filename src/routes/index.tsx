import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Bell, Menu, Coins } from "lucide-react";
import { NextEquipment } from "@/components/NextEquipment";

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
  const minutesToday = 0;
  const coins = 300;
  // Next planned workout determines what gets built
  const nextWorkout = {
    title: "Push Day",
    time: "Today · 6:30 PM",
    gym: "Sweat Lab",
    equipment: "powerRack" as const,
    equipmentLabel: "Power Rack",
    progress: 0.62, // ring progress (e.g. weekly plan completion)
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-hero px-5 pb-6 pt-10 text-foreground">
      {/* Top bar */}
      <header className="flex items-center justify-between">
        <button className="grid h-10 w-10 place-items-center rounded-full bg-surface-1/60 backdrop-blur">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1.5 rounded-full bg-surface-1/70 px-3 py-1.5 text-sm backdrop-blur">
          <Flame className="h-4 w-4 text-accent" fill="currentColor" />
          <span className="font-medium">{streak}</span>
          <span className="mx-1 text-muted-foreground">·</span>
          <span className="text-muted-foreground">day streak</span>
        </div>
        <button className="flex items-center gap-1.5 rounded-full bg-surface-1/70 px-3 py-1.5 text-sm backdrop-blur">
          <Coins className="h-4 w-4 text-accent" />
          <span className="font-medium">{coins}</span>
        </button>
      </header>

      {/* Headline */}
      <p className="mt-8 text-center text-base text-muted-foreground">
        {minutesToday > 0
          ? `You've trained for ${minutesToday} mins today.`
          : "Your next session will build:"}
      </p>
      <p className="mt-1 text-center font-display text-2xl font-semibold">
        {nextWorkout.equipmentLabel}
      </p>

      {/* Big circular focus */}
      <div className="relative my-8 flex flex-1 items-center justify-center">
        <NextEquipment equipment={nextWorkout.equipment} progress={nextWorkout.progress} />
      </div>

      {/* Workout pill */}
      <div className="mx-auto flex items-center gap-2 rounded-full bg-surface-1/70 px-4 py-1.5 text-sm backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-accent" />
        <span className="text-muted-foreground">{nextWorkout.time}</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-medium">{nextWorkout.title}</span>
      </div>

      {/* Prove it button */}
      <Link
        to="/prove"
        className="mt-6 block rounded-2xl bg-gradient-accent py-4 text-center font-display text-lg font-semibold text-accent-foreground shadow-glow transition-transform active:scale-[0.98]"
      >
        Prove it
      </Link>

      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <Link to="/gym" className="underline-offset-4 hover:underline">Visit gym</Link>
        <span>·</span>
        <Link to="/schedule" className="underline-offset-4 hover:underline">Schedule</Link>
      </div>
    </div>
  );
}