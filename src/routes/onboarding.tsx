import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, MapPin, Target, Dumbbell, Check } from "lucide-react";
import { IsometricGym } from "@/components/IsometricGym";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Proofit — Welcome" },
      { name: "description", content: "Set your goals, your gym, and your schedule." },
    ],
  }),
  component: Onboarding,
});

const goals = ["Build muscle", "Lose fat", "Get consistent", "Train for sport", "Mental health"];
const gyms = ["Sweat Lab — 1.2 mi", "Iron Yard — 0.8 mi", "Riverside Track — 2.0 mi"];
const slots = ["Mon AM", "Tue PM", "Wed AM", "Thu PM", "Fri AM", "Sat AM", "Sun"];

function Onboarding() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Record<string, Set<string>>>({
    goals: new Set(),
    gyms: new Set(),
    slots: new Set(),
  });
  const navigate = useNavigate();

  const toggle = (key: string, value: string) =>
    setSelected((prev) => {
      const next = new Set(prev[key]);
      next.has(value) ? next.delete(value) : next.add(value);
      return { ...prev, [key]: next };
    });

  const steps = [
    {
      title: "Welcome to Proofit",
      body: (
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 w-full max-w-xs">
            <IsometricGym level={1} />
          </div>
          <h2 className="font-display text-3xl font-semibold text-balance">
            Build a gym you can be proud of
          </h2>
          <p className="mt-3 text-sm text-muted-foreground text-balance">
            Schedule workouts. Prove you showed up. Watch your gym grow. Miss a session, and it
            starts to crumble.
          </p>
        </div>
      ),
    },
    {
      title: "What are you chasing?",
      icon: Target,
      body: (
        <Chips
          items={goals}
          selected={selected.goals}
          onToggle={(v) => toggle("goals", v)}
        />
      ),
    },
    {
      title: "Where do you train?",
      icon: MapPin,
      body: (
        <Chips
          items={gyms}
          selected={selected.gyms}
          onToggle={(v) => toggle("gyms", v)}
        />
      ),
    },
    {
      title: "Lock in your week",
      icon: Dumbbell,
      body: (
        <Chips
          items={slots}
          selected={selected.slots}
          onToggle={(v) => toggle("slots", v)}
        />
      ),
    },
    {
      title: "Your garage gym awaits",
      body: (
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 w-full max-w-xs">
            <IsometricGym level={1} />
          </div>
          <p className="text-sm text-muted-foreground text-balance">
            Start small. Every proven workout adds to your gym. Every missed one chips away. Ready?
          </p>
        </div>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div className="flex min-h-screen flex-col px-5 pb-8 pt-12">
      <div className="mb-8 flex items-center gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i <= step ? "bg-accent" : "bg-surface-3"
            }`}
          />
        ))}
      </div>

      <div key={step} className="flex flex-1 flex-col animate-fade-up">
        <h1 className="font-display text-2xl font-semibold">{current.title}</h1>
        <div className="mt-6 flex-1">{current.body}</div>
      </div>

      <div className="flex items-center gap-3 pt-6">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="rounded-2xl border border-border px-5 py-4 font-display text-sm font-medium"
          >
            Back
          </button>
        )}
        <button
          onClick={() => (step === steps.length - 1 ? navigate({ to: "/" }) : setStep(step + 1))}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-accent py-4 font-display font-semibold text-accent-foreground shadow-glow"
        >
          {step === steps.length - 1 ? "Enter my gym" : "Continue"}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Chips({
  items,
  selected,
  onToggle,
}: {
  items: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const on = selected.has(it);
        return (
          <button
            key={it}
            onClick={() => onToggle(it)}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all ${
              on
                ? "border-accent bg-accent/15 text-foreground shadow-glow"
                : "border-border bg-surface-1 text-muted-foreground"
            }`}
          >
            {on && <Check className="h-3.5 w-3.5 text-accent" />}
            {it}
          </button>
        );
      })}
    </div>
  );
}