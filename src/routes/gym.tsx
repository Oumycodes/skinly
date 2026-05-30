import { createFileRoute } from "@tanstack/react-router";
import { IsometricGym } from "@/components/IsometricGym";
import { Lock, Star, AlertTriangle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/gym")({
  head: () => ({
    meta: [
      { title: "Proofit — Your Gym" },
      { name: "description", content: "Build, upgrade, and protect your gym." },
    ],
  }),
  component: GymPage,
});

const equipment = [
  { name: "Bench Press", unlocked: true, level: 2 },
  { name: "Dumbbell Rack", unlocked: true, level: 1 },
  { name: "Squat Rack", unlocked: true, level: 1, damaged: true },
  { name: "Cardio Zone", unlocked: false, cost: 320, progress: 62 },
  { name: "Locker Room", unlocked: false, cost: 580 },
  { name: "Reception", unlocked: false, cost: 900 },
  { name: "Sauna", unlocked: false, cost: 1500, luxury: true },
  { name: "Smoothie Bar", unlocked: false, cost: 2200, luxury: true },
];

function GymPage() {
  const [showDamage, setShowDamage] = useState(false);
  const coins = 248;

  return (
    <div className="flex flex-col gap-6 px-5 pb-6 pt-12">
      <header className="flex items-end justify-between animate-fade-up">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">My gym</p>
          <h1 className="font-display text-3xl font-semibold">Iron Garage</h1>
          <p className="mt-1 text-sm text-muted-foreground">Level 3 · Reputation 84</p>
        </div>
        <div className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent">
          ◈ {coins}
        </div>
      </header>

      <div className="overflow-hidden rounded-3xl border border-border bg-surface-1 shadow-card animate-fade-up">
        <IsometricGym level={3} damaged={showDamage} />
        <div className="flex gap-2 p-3 text-xs">
          <button
            onClick={() => setShowDamage(false)}
            className={`flex-1 rounded-xl px-3 py-2 font-medium ${!showDamage ? "bg-accent text-accent-foreground" : "bg-surface-2 text-muted-foreground"}`}
          >
            Healthy view
          </button>
          <button
            onClick={() => setShowDamage(true)}
            className={`flex-1 rounded-xl px-3 py-2 font-medium ${showDamage ? "bg-destructive/80 text-destructive-foreground" : "bg-surface-2 text-muted-foreground"}`}
          >
            Damage preview
          </button>
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Equipment</h2>
        <div className="grid grid-cols-2 gap-3">
          {equipment.map((e) => (
            <EquipmentCard key={e.name} {...e} />
          ))}
        </div>
      </section>
    </div>
  );
}

function EquipmentCard(e: {
  name: string;
  unlocked: boolean;
  level?: number;
  damaged?: boolean;
  cost?: number;
  progress?: number;
  luxury?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col gap-2 rounded-2xl border p-4 shadow-card animate-fade-up ${
        e.unlocked
          ? "border-border bg-surface-1"
          : "border-dashed border-border/60 bg-surface-1/50"
      }`}
    >
      {e.luxury && (
        <Star className="absolute right-3 top-3 h-3.5 w-3.5 fill-accent text-accent" />
      )}
      {e.damaged && (
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-semibold text-destructive">
          <AlertTriangle className="h-2.5 w-2.5" /> damaged
        </span>
      )}
      <div
        className={`grid h-10 w-10 place-items-center rounded-xl ${
          e.unlocked ? "bg-accent/15 text-accent" : "bg-surface-3 text-muted-foreground"
        }`}
      >
        {e.unlocked ? "★" : <Lock className="h-4 w-4" />}
      </div>
      <div>
        <p className="font-semibold leading-tight">{e.name}</p>
        {e.unlocked && (
          <p className="text-xs text-muted-foreground">Lv {e.level}</p>
        )}
        {!e.unlocked && (
          <p className="text-xs text-muted-foreground">◈ {e.cost}</p>
        )}
      </div>
      {typeof e.progress === "number" && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full bg-gradient-accent" style={{ width: `${e.progress}%` }} />
        </div>
      )}
    </div>
  );
}