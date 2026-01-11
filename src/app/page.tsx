import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  if (session?.user?.id) {
    return (
      <main className="min-h-screen bg-[#151515] text-zinc-100">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Obscra</p>
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Your library is ready.
          </h1>
          <Link
            href="/library"
            className="border-b border-zinc-500 pb-1 text-xs uppercase tracking-[0.25em] text-zinc-200 transition hover:border-zinc-300 hover:text-white active:scale-95"
          >
            Go to library
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#151515] text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
        <header className="flex items-center justify-between py-6 text-xs uppercase tracking-[0.25em] text-zinc-400">
          <div className="text-zinc-300">Obscra</div>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="transition hover:text-white">
              Sign in
            </Link>
            <Link href="/register" className="transition hover:text-white">
              Create account
            </Link>
          </nav>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
          <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">
            Read long-form without friction.
          </h1>
          <p className="max-w-xl text-sm text-zinc-400 sm:text-base">
            Library sync and high-fidelity TTS, without the clutter.
          </p>
        </section>

        <section id="features" className="border-t border-zinc-800 py-10 text-sm text-zinc-400">
          <div className="mx-auto grid max-w-3xl gap-3 text-center">
            <p>Import EPUBs fast.</p>
            <p>Precise typography controls.</p>
            <p>Progress sync across devices.</p>
          </div>
        </section>

        <section id="tts" className="border-t border-zinc-800 py-10 text-center text-sm text-zinc-400">
          <p>High-fidelity TTS with clean, hands-free controls.</p>
        </section>

        <footer className="border-t border-zinc-800 py-6 text-xs text-zinc-500">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="uppercase tracking-[0.18em] text-zinc-300">Obscra</span>
            <a
              href="https://x.com/s4lvaholic"
              className="text-zinc-400 transition hover:text-white"
              target="_blank"
              rel="noreferrer"
            >
              @s4lvaholic
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
