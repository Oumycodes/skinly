import { createFileRoute } from "@tanstack/react-router";
import { Plus, Clock, MapPin, MoreHorizontal, Edit3, Trash2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Proofit — Schedule" },
      { name: "description", content: "Plan your week. Lock it in. Show up." },
    ],
  }),
  component: SchedulePage,
});

type Session = {
  day: number; // 0-6
  time: string;
  title: string;
  location: string;
  done?: boolean;
  missed?: boolean;
};

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const initial: Session[] = [
  { day: 0, time: "6:30 AM", title: "Pull Day", location: "Sweat Lab", done: true },
  { day: 1, time: "6:30 PM", title: "Leg Day", location: "Sweat Lab", missed: true },
  { day: 2, time: "6:30 AM", title: "Push Day", location: "Sweat Lab", done: true },
  { day: 3, time: "7:00 PM", title: "Cardio", location: "Riverside Track" },
  { day: 5, time: "10:00 AM", title: "Full Body", location: "Sweat Lab" },
];

function SchedulePage() {
  const [today] = useState(5); // Saturday
  const adherence = 78;

  return (
    <div className="flex flex-col gap-6 px-5 pb-6 pt-12">
      <header className="animate-fade-up">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">This week</p>
        <h1 className="font-display text-3xl font-semibold">Schedule</h1>
      </header>

      {/* Adherence */}
      <div className="animate-fade-up rounded-3xl border border-border bg-surface-1 p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Adherence</p>
            <p className="font-display text-3xl font-semibold">{adherence}%</p>
          </div>
          <Ring value={adherence} />
        </div>
        <div className="mt-4 flex justify-between gap-1.5">
          {days.map((d, i) => {
            const s = initial.find((x) => x.day === i);
            const state = s?.done ? "done" : s?.missed ? "missed" : s ? "scheduled" : "off";
            return (
              <div key={d} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {d}
                </span>
                <div
                  className={`h-9 w-9 rounded-xl text-xs grid place-items-center font-semibold ${
                    state === "done"
                      ? "bg-accent text-accent-foreground shadow-glow"
                      : state === "missed"
                        ? "bg-destructive/20 text-destructive border border-destructive/40"
                        : state === "scheduled"
                          ? "bg-surface-3 text-foreground"
                          : "bg-surface-2 text-muted-foreground/40"
                  } ${i === today ? "ring-2 ring-accent/50 ring-offset-2 ring-offset-background" : ""}`}
                >
                  {i + 1 + 17}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sessions list */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Sessions</h2>
          <button className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground shadow-glow">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        {initial.map((s, i) => (
          <SessionCard key={i} session={s} day={days[s.day]} />
        ))}
      </section>
    </div>
  );
}

function SessionCard({ session, day }: { session: Session; day: string }) {
  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-border bg-surface-1 p-4 shadow-card animate-fade-up">
      <div
        className={`flex h-14 w-14 flex-col items-center justify-center rounded-xl text-center ${
          session.done
            ? "bg-accent text-accent-foreground"
            : session.missed
              ? "bg-destructive/15 text-destructive"
              : "bg-surface-3 text-foreground"
        }`}
      >
        <span className="text-[10px] uppercase">{day}</span>
        <span className="font-display text-lg font-bold leading-none">
          {session.time.split(" ")[0].split(":")[0]}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display font-semibold">{session.title}</p>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {session.time}
          </span>
          <span className="flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3" /> {session.location}
          </span>
        </div>
        {session.missed && (
          <p className="mt-1 text-[11px] font-medium text-destructive">Missed · gym damaged</p>
        )}
      </div>
      <button className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2">
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} stroke="var(--surface-3)" strokeWidth="6" fill="none" />
      <circle
        cx="36"
        cy="36"
        r={r}
        stroke="oklch(0.92 0.18 125)"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
        transform="rotate(-90 36 36)"
      />
    </svg>
  );
}