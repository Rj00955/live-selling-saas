"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      // Si Next.js conserve cette page en mémoire après la connexion,
      // elle doit rester utilisable : on efface le mot de passe et on
      // réactive le bouton avant de quitter la page.
      setPassword("");
      setSubmitting(false);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F6F4] p-5">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-[#E5E9E4] bg-white p-8 shadow-sm"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#405C49] text-lg font-bold text-white">
            T
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#252B27]">Tiako Live</h1>
            <p className="text-xs text-[#7B857D]">Connexion à votre espace</p>
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-[#252B27]" htmlFor="email">
          Adresse e-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-[#D5DBD4] px-3 py-2 text-sm outline-none focus:border-[#405C49]"
        />

        <label className="mb-1 block text-sm font-medium text-[#252B27]" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-[#D5DBD4] px-3 py-2 text-sm outline-none focus:border-[#405C49]"
        />

        {error && (
          <p role="alert" className="mb-4 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[#405C49] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#33493a] disabled:opacity-60"
        >
          {submitting ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}