"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.replace("/library");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          className="border border-zinc-800 bg-black/40 px-3 py-3 text-zinc-100 focus:border-zinc-300 focus:outline-none"
          autoComplete="email"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">
          Password
        </span>
        <input
          name="password"
          type="password"
          required
          className="border border-zinc-800 bg-black/40 px-3 py-3 text-zinc-100 focus:border-zinc-300 focus:outline-none"
          autoComplete="current-password"
        />
      </label>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="border border-zinc-200/40 px-4 py-3 text-zinc-50 transition hover:border-zinc-50 disabled:opacity-50"
      >
        {isSubmitting ? "Signing in..." : "Enter"}
      </button>
    </form>
  );
}
