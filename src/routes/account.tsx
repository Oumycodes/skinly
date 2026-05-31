import { createFileRoute, Link } from "@tanstack/react-router";
import { User, Settings, Bell, Shield, HelpCircle, ChevronRight, LogOut } from "lucide-react";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Proofit — Account" },
      { name: "description", content: "Your profile and settings." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  return (
    <div className="flex flex-col gap-6 px-5 pb-6 pt-12">
      <header className="animate-fade-up">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Profile</p>
        <h1 className="font-display text-3xl font-semibold">Account</h1>
      </header>

      {/* Profile card */}
      <div
        className="animate-fade-up flex items-center gap-4 rounded-3xl border border-border bg-surface-1 p-5 shadow-card"
        style={{ animationDelay: "60ms" }}
      >
        <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-accent font-display text-xl font-bold text-accent-foreground shadow-glow">
          AL
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg font-semibold">Alex</p>
          <p className="text-sm text-muted-foreground">Level 3 · 12-day streak</p>
        </div>
        <Link
          to="/progress"
          className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-accent/50"
        >
          Stats <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Settings sections */}
      <section className="flex flex-col gap-2 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <h2 className="mb-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Preferences
        </h2>
        <SettingsRow icon={<Bell className="h-4 w-4" />} label="Notifications" />
        <SettingsRow icon={<Settings className="h-4 w-4" />} label="Workout Preferences" />
        <SettingsRow icon={<Shield className="h-4 w-4" />} label="Privacy" />
      </section>

      <section className="flex flex-col gap-2 animate-fade-up" style={{ animationDelay: "180ms" }}>
        <h2 className="mb-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Support
        </h2>
        <SettingsRow icon={<HelpCircle className="h-4 w-4" />} label="Help & Feedback" />
      </section>

      {/* Sign out */}
      <button
        className="animate-fade-up mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface-1 py-3.5 text-sm font-medium text-muted-foreground shadow-card transition-colors hover:text-foreground"
        style={{ animationDelay: "240ms" }}
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  );
}

function SettingsRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="group flex items-center gap-3 rounded-2xl border border-border bg-surface-1 p-4 shadow-card transition-colors hover:border-accent/30">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted-foreground">
        {icon}
      </div>
      <span className="flex-1 text-left text-sm font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
