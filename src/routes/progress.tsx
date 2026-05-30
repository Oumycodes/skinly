import { createFileRoute } from "@tanstack/react-router";
import { Flame, Trophy, Calendar, TrendingUp, Award } from "lucide-react";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Proofit — Progress" },
      { name: "description", content: "Streaks, consistency, and badges earned." },
    ],
  }),
  component: ProgressPage,
});

const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const heat = [40, 60, 70, 55, 80, 90, 75, 85, 92, 78, 88, 95];

const badges = [
  { name: "First Rep", earned: true },
  { name: "7-Day Fire", earned: true },
  { name: "Iron Will", earned: true },
  { name: "Cardio King", earned: false },
  { name: "30-Day Forge", earned: false },
  { name: "Gym Mogul", earned: false },
];

const timeline = [
  { date: "Today", event: "Gym reached Level 3", icon: TrendingUp },
  { date: "Tue", event: "Squat Rack unlocked", icon: Trophy },
  { date: "Last week", event: "Hit 10-day streak", icon: Flame },
  { date: "May 12", event: "Joined Proofit", icon: Calendar },
];

function ProgressPage() {
  return (
    <div className="flex flex-col gap-6 px-5 pb-6 pt-12">
      <header className="animate-fade-up">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">All-time</p>
        <h1 className="font-display text-3xl font-semibold">Progress</h1>
      </header>

      <div className="grid grid-cols-3 gap-3 animate-fade-up">
        <Stat label="Streak" value="12" icon={<Flame className="h-3.5 w-3.5" />} />
        <Stat label="Total" value="84" icon={<Trophy className="h-3.5 w-3.5" />} />
        <Stat label="Rate" value="78%" icon={<TrendingUp className="h-3.5 w-3.5" />} />
      </div>

      {/* Yearly heatmap */}
      <section className="rounded-3xl border border-border bg-surface-1 p-5 shadow-card animate-fade-up">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Consistency</h2>
          <span className="text-xs text-muted-foreground">Last 12 months</span>
        </div>
        <div className="mt-4 flex items-end justify-between gap-1.5">
          {heat.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-32 w-full items-end">
                <div
                  className="w-full rounded-md bg-gradient-accent"
                  style={{ height: `${v}%`, opacity: 0.4 + v / 200 }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{months[i]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Gym growth timeline */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Gym timeline</h2>
        <div className="relative flex flex-col gap-4 pl-6">
          <div className="absolute left-2 top-1.5 bottom-1.5 w-px bg-border" />
          {timeline.map((t, i) => (
            <div key={i} className="relative animate-fade-up">
              <div className="absolute -left-[18px] top-1.5 grid h-4 w-4 place-items-center rounded-full border-2 border-background bg-accent">
                <t.icon className="h-2 w-2 text-accent-foreground" />
              </div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t.date}</p>
              <p className="font-medium">{t.event}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Badges */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Badges</h2>
          <span className="text-xs text-muted-foreground">3 / 6</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {badges.map((b) => (
            <div
              key={b.name}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center shadow-card animate-fade-up ${
                b.earned ? "border-accent/40 bg-surface-1" : "border-dashed border-border bg-surface-1/40"
              }`}
            >
              <div
                className={`grid h-12 w-12 place-items-center rounded-full ${
                  b.earned ? "bg-gradient-accent text-accent-foreground shadow-glow" : "bg-surface-3 text-muted-foreground"
                }`}
              >
                <Award className="h-6 w-6" />
              </div>
              <p className={`text-xs font-medium ${b.earned ? "" : "text-muted-foreground"}`}>
                {b.name}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-4 shadow-card">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}