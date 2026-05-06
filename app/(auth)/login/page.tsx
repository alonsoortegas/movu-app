"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
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
    router.push("/dashboard");
  };

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white border border-[#e8e8e8] rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold" style={{ color: "var(--accent)" }}>movu</span>
        </div>
        <h1 className="text-xl font-bold text-[#111] mb-1">Welcome back</h1>
        <p className="text-sm text-[#aaa] mb-6">Sign in to your account</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#444] mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-[#f9f9f9] border border-[#e8e8e8] rounded-lg px-4 py-3 text-sm text-[#111] placeholder-[#aaa] outline-none focus:border-[#6be040] focus:ring-2 focus:ring-[#6be040]/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#444] mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-[#f9f9f9] border border-[#e8e8e8] rounded-lg px-4 py-3 text-sm text-[#111] placeholder-[#aaa] outline-none focus:border-[#6be040] focus:ring-2 focus:ring-[#6be040]/20 transition-all"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-[#6be040] text-white hover:opacity-90 transition-all disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-center text-sm text-[#aaa] mt-6">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="text-[#6be040] font-medium hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  );
}
