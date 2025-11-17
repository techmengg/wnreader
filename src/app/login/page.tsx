import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { auth } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/library");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020202] px-6 text-zinc-100">
      <div className="flex w-full max-w-md flex-col gap-6">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            wnreader
          </p>
          <h1 className="text-2xl text-zinc-50">
            slip back into your stories
          </h1>
        </header>
        <LoginForm />
        <p className="text-xs text-zinc-500">
          Don&apos;t have one?{" "}
          <Link href="/register" className="text-zinc-100 underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
