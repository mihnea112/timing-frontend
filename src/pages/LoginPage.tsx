import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function LoginPage() {
  const { login, register } = useAuth();
  const nav = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name);
      nav("/app");
    } catch {
      setError("Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{mode === "login" ? "Sign in" : "Create account"}</h1>
          <button
            className="text-sm text-neutral-300 hover:text-white"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            type="button"
          >
            {mode === "login" ? "Need an account?" : "Have an account?"}
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          {mode === "register" && (
            <input
              className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}

          <input
            className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
          <input
            className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />

          {error && <div className="text-sm text-red-400">{error}</div>}

          <button
            className="w-full px-4 py-2 rounded bg-white text-black font-semibold hover:opacity-90 disabled:opacity-60"
            disabled={busy}
          >
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}