"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    const next = searchParams.get("next") ?? "/dashboard";
    router.push(/^\/[^/]/.test(next) ? next : "/dashboard");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          placeholder="••••••••"
          className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
        />
      </div>
      {error && <p className="text-sm text-[var(--coral)]">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="btn-accent w-full rounded-xl py-3 text-sm font-bold disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flicker w-full max-w-sm">
      <div className="glass-thick ticks rounded-3xl border border-[var(--border-hi)] p-8">
        <div className="text-center mb-8">
          <span className="display text-2xl font-bold text-[var(--text)]">mov<span className="text-accent">u</span></span>
        </div>
        <h1 className="display mb-1 text-xl font-bold text-[var(--text)]">Welcome back</h1>
        <p className="text-sm text-[var(--text-faint)] mb-6">Sign in to your account</p>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="text-center text-sm text-[var(--text-faint)] mt-6">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="text-accent font-medium hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  );
}
