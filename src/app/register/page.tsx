import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { auth } from "@/lib/auth";

export default async function RegisterPage() {
  const session = await auth();

  if (session?.user) {
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
            create space for your chapters
          </h1>
        </header>
        <RegisterForm />
        <p className="text-xs text-zinc-500">
          Already inside?{" "}
          <Link href="/login" className="text-zinc-100 underline">
            Return to login
          </Link>
        </p>
      </div>
    </div>
  );
}
