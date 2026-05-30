import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { X, MapPin, Camera, RotateCcw, Check } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/prove")({
  head: () => ({
    meta: [
      { title: "Proofit — Prove it" },
      { name: "description", content: "Verify your workout. GPS + selfie + gym photo." },
    ],
  }),
  component: ProvePage,
});

type Step = "intro" | "gps" | "selfie" | "gym" | "success";

function ProvePage() {
  const [step, setStep] = useState<Step>("intro");
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-5 pt-12">
        <Link
          to="/"
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface-1"
        >
          <X className="h-4 w-4" />
        </Link>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Workout</p>
          <p className="text-sm font-semibold">Push Day · 6:30 PM</p>
        </div>
        <div className="h-10 w-10" />
      </header>

      {step === "intro" && <Intro onStart={() => setStep("gps")} />}
      {step === "gps" && <GpsStep onDone={() => setStep("selfie")} />}
      {step === "selfie" && (
        <CameraStep label="Selfie" facing="front" onDone={() => setStep("gym")} />
      )}
      {step === "gym" && (
        <CameraStep label="Gym shot" facing="back" onDone={() => setStep("success")} />
      )}
      {step === "success" && <Success onClose={() => navigate({ to: "/" })} />}
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="relative mb-10">
        <div className="absolute inset-0 rounded-full bg-accent/40 animate-pulse-ring" />
        <button
          onClick={onStart}
          className="relative grid h-60 w-60 place-items-center rounded-full bg-gradient-accent text-accent-foreground shadow-glow"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.3em] opacity-70">Hold to start</p>
            <p className="font-display text-4xl font-bold">PROVE IT</p>
          </div>
        </button>
      </div>
      <p className="text-sm text-muted-foreground text-balance">
        We'll verify your location, take a selfie, and one shot of the gym. Takes 30 seconds.
      </p>
      <div className="mt-6 flex gap-2 text-xs">
        <Pill>GPS</Pill>
        <Pill>Selfie</Pill>
        <Pill>Gym photo</Pill>
      </div>
    </div>
  );
}

function GpsStep({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center animate-fade-up">
      <div className="relative grid h-40 w-40 place-items-center rounded-full bg-surface-1 border border-border">
        <div className="absolute inset-0 rounded-full bg-accent/20 animate-pulse-ring" />
        <MapPin className="h-12 w-12 text-accent" />
      </div>
      <div>
        <h2 className="font-display text-2xl font-semibold">Locking GPS…</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sweat Lab · 0.0 mi</p>
      </div>
      <Indicator items={[
        { label: "Location services", ok: true },
        { label: "Inside gym geofence", ok: true },
        { label: "Timestamp verified", ok: true },
      ]} />
      <button
        onClick={onDone}
        className="mt-4 w-full max-w-xs rounded-2xl bg-gradient-accent py-4 font-display font-semibold text-accent-foreground shadow-glow"
      >
        Continue
      </button>
    </div>
  );
}

function CameraStep({
  label,
  facing,
  onDone,
}: {
  label: string;
  facing: "front" | "back";
  onDone: () => void;
}) {
  const [captured, setCaptured] = useState(false);
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 animate-fade-up">
      <div className="relative aspect-[3/4] w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-surface-1 shadow-card">
        <div className="absolute inset-0 bg-gradient-hero opacity-60" />
        <div className="absolute inset-4 rounded-2xl border-2 border-dashed border-accent/40" />
        <div className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-[10px] uppercase tracking-wider">
          {facing === "front" ? "Front camera" : "Rear camera"}
        </div>
        {captured && (
          <div className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-sm">
            <Check className="h-16 w-16 text-accent" />
          </div>
        )}
      </div>
      <p className="mt-6 font-display text-xl font-semibold">{label}</p>
      <p className="text-sm text-muted-foreground">
        {facing === "front" ? "Show your face — sweaty preferred" : "Snap the gym floor"}
      </p>
      <div className="mt-6 flex items-center gap-6">
        <button className="grid h-12 w-12 place-items-center rounded-full border border-border bg-surface-1">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            setCaptured(true);
            setTimeout(onDone, 600);
          }}
          className="grid h-20 w-20 place-items-center rounded-full bg-gradient-accent text-accent-foreground shadow-glow"
        >
          <Camera className="h-7 w-7" />
        </button>
        <div className="h-12 w-12" />
      </div>
    </div>
  );
}

function Success({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center animate-fade-up">
      <div className="relative grid h-32 w-32 place-items-center rounded-full bg-gradient-accent shadow-glow">
        <Check className="h-16 w-16 text-accent-foreground" strokeWidth={3} />
        <div className="absolute inset-0 rounded-full bg-accent/30 animate-pulse-ring" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Verified</p>
        <h2 className="font-display text-3xl font-semibold">Workout proven</h2>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2 rounded-2xl border border-border bg-surface-1 p-4">
        <Reward label="Streak" value="+1 day · 13 total" />
        <Reward label="Coins" value="+45" />
        <Reward label="Reputation" value="+2 pts" />
        <Reward label="Gym progress" value="+8% → Cardio Zone" />
      </div>
      <button
        onClick={onClose}
        className="w-full max-w-xs rounded-2xl bg-foreground py-4 font-display font-semibold text-background"
      >
        Back home
      </button>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-surface-1 px-3 py-1 text-muted-foreground">
      {children}
    </span>
  );
}

function Indicator({ items }: { items: { label: string; ok: boolean }[] }) {
  return (
    <div className="flex flex-col gap-2 text-left">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3 text-sm">
          <span
            className={`grid h-5 w-5 place-items-center rounded-full ${it.ok ? "bg-accent text-accent-foreground" : "bg-surface-3"}`}
          >
            <Check className="h-3 w-3" />
          </span>
          {it.label}
        </div>
      ))}
    </div>
  );
}

function Reward({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}