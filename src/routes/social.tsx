import { createFileRoute } from "@tanstack/react-router";
import { Flame, Search, Plus, Trophy } from "lucide-react";

export const Route = createFileRoute("/social")({
  head: () => ({
    meta: [
      { title: "Proofit — Friends" },
      { name: "description", content: "Compete with friends. Visit their gyms." },
    ],
  }),
  component: SocialPage,
});

const friends = [
  { name: "Maya", streak: 28, level: 5, initials: "MA", you: false, rank: 1 },
  { name: "Devon", streak: 19, level: 4, initials: "DV", you: false, rank: 2 },
  { name: "You", streak: 12, level: 3, initials: "AL", you: true, rank: 3 },
  { name: "Sam", streak: 9, level: 3, initials: "SA", you: false, rank: 4 },
  { name: "Priya", streak: 5, level: 2, initials: "PR", you: false, rank: 5 },
];

const challenge = {
  title: "Weekend Warriors",
  desc: "Hit 4 workouts before Sunday night.",
  progress: 2,
  total: 4,
  reward: 150,
  ends: "2d 4h",
};

function SocialPage() {
  return (
    <div className="flex flex-col gap-6 px-5 pb-6 pt-12">
      <header className="flex items-end justify-between animate-fade-up">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">This week</p>
          <h1 className="font-display text-3xl font-semibold">Friends</h1>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground shadow-glow">
          <Plus className="h-4 w-4" />
        </button>
      </header>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface-1 px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Find friends or visit a gym"
          className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* Weekly challenge */}
      <section className="rounded-3xl border border-accent/30 bg-gradient-hero p-5 shadow-card animate-fade-up">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.2em] text-accent">Weekly challenge</span>
          <span className="text-[10px] text-muted-foreground">Ends in {challenge.ends}</span>
        </div>
        <h2 className="mt-1 font-display text-xl font-semibold">{challenge.title}</h2>
        <p className="text-sm text-muted-foreground">{challenge.desc}</p>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="font-semibold">
            {challenge.progress} / {challenge.total} workouts
          </span>
          <span className="text-accent">+◈ {challenge.reward}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full bg-gradient-accent"
            style={{ width: `${(challenge.progress / challenge.total) * 100}%` }}
          />
        </div>
      </section>

      {/* Leaderboard */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-accent" />
          <h2 className="font-display text-lg font-semibold">Leaderboard</h2>
        </div>
        <div className="flex flex-col gap-2">
          {friends.map((f) => (
            <div
              key={f.name}
              className={`flex items-center gap-4 rounded-2xl border p-3 shadow-card animate-fade-up ${
                f.you ? "border-accent/50 bg-accent/5" : "border-border bg-surface-1"
              }`}
            >
              <span className="w-5 text-center font-display text-sm font-semibold text-muted-foreground">
                {f.rank}
              </span>
              <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-accent font-display text-sm font-bold text-accent-foreground">
                {f.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{f.name}</p>
                <p className="text-xs text-muted-foreground">Lv {f.level} gym</p>
              </div>
              <div className="flex items-center gap-1 text-sm font-semibold">
                <Flame className="h-4 w-4 text-accent" fill="currentColor" />
                {f.streak}
              </div>
              {!f.you && (
                <button className="rounded-full border border-border px-3 py-1 text-[11px] font-medium hover:border-accent/50">
                  Visit
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}