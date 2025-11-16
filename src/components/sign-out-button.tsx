"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-xs uppercase tracking-[0.3em] text-zinc-500 transition hover:text-zinc-200"
    >
      Sign out
    </button>
  );
}
