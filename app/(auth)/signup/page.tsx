"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Step = "invite" | "register" | "done";

export default function SignupPage() {
  const [step, setStep] = useState<Step>("invite");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);

  const INVITE_ERRORS: Record<string, string> = {
    not_found: "Invite code not found.",
    inactive: "This invite code is no longer active.",
    used_up: "This invite code has already been used.",
    expired: "This invite code has expired.",
    code_required: "Please enter an invite code.",
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteLoading(true);
    const res = await fetch("/api/invite/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: inviteCode }),
    });
    const data = await res.json();
    setInviteLoading(false);
    if (!data.valid) {
      setInviteError(INVITE_ERRORS[data.reason] ?? "Invalid invite code.");
      return;
    }
    setStep("register");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, invite_code: inviteCode } },
    });
    setRegisterLoading(false);
    if (error) {
      setRegisterError(error.message);
      return;
    }
    setStep("done");
  };

  return (
    <div className="flicker w-full max-w-sm">
      <div className="glass-thick ticks rounded-3xl border border-[var(--border-hi)] p-8">
        <div className="text-center mb-8">
          <span className="display text-2xl font-bold text-[var(--text)]">mov<span className="text-accent">u</span></span>
        </div>

        {step === "invite" && (
          <>
            <h1 className="display mb-1 text-xl font-bold text-[var(--text)]">Join movu</h1>
            <p className="text-sm text-[var(--text-faint)] mb-6">Enter your invite code to get started</p>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Invite code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  placeholder="XXXX-XXXX"
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>
              {inviteError && <p className="text-sm text-[var(--coral)]">{inviteError}</p>}
              <button
                type="submit"
                disabled={inviteLoading}
                className="btn-accent w-full rounded-xl py-3 text-sm font-bold disabled:opacity-60"
              >
                {inviteLoading ? "Checking…" : "Continue"}
              </button>
            </form>
          </>
        )}

        {step === "register" && (
          <>
            <h1 className="display mb-1 text-xl font-bold text-[var(--text)]">Create your account</h1>
            <p className="text-sm text-[var(--text-faint)] mb-6">Fill in your details to sign up</p>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Ana García"
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>
              {registerError && <p className="text-sm text-[var(--coral)]">{registerError}</p>}
              <button
                type="submit"
                disabled={registerLoading}
                className="btn-accent w-full rounded-xl py-3 text-sm font-bold disabled:opacity-60"
              >
                {registerLoading ? "Creating account…" : "Create account"}
              </button>
            </form>
          </>
        )}

        {step === "done" && (
          <div className="text-center py-4">
            <div className="data mb-4 text-4xl text-accent" aria-hidden="true">✉</div>
            <h1 className="display mb-2 text-xl font-bold text-[var(--text)]">Check your email</h1>
            <p className="text-sm text-[var(--text-faint)]">
              We sent a confirmation link to <strong className="text-[var(--text)]">{email}</strong>. Click it to activate your account.
            </p>
          </div>
        )}

        {step !== "done" && (
          <p className="text-center text-sm text-[var(--text-faint)] mt-6">
            Already have an account?{" "}
            <a href="/login" className="text-accent font-medium hover:underline">Sign in</a>
          </p>
        )}
      </div>
    </div>
  );
}
