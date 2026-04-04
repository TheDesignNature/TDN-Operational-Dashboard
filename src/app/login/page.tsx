"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push(from);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Incorrect password");
        setPassword("");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal mb-4">
            <span className="font-heading text-sm font-bold text-white tracking-tight">
              TDN
            </span>
          </div>
          <h1 className="font-heading text-2xl font-semibold text-teal tracking-wide">
            Marketing Engine
          </h1>
          <p className="text-sm text-teal/40 mt-1">
            The Design Nature
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-card shadow-card border border-sand/40 p-6">
          <p className="text-sm text-teal/60 mb-5 text-center">
            Enter your password to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-teal/50 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
                required
                className="input-base"
              />
            </div>

            {error && (
              <p className="text-xs text-status-action bg-status-action-bg border border-status-action-border rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="btn-primary w-full justify-center"
            >
              {loading ? "Checking..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-2xs text-teal/25 mt-6">
          The Design Nature · Internal use only
        </p>
      </div>
    </div>
  );
}
