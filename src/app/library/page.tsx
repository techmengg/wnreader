import Link from "next/link";
import { redirect } from "next/navigation";
import { EpubImport } from "@/components/epub-import";
import { SignOutButton } from "@/components/sign-out-button";
import { LibraryItemActions } from "@/components/library-item-actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LibraryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const novels = await prisma.novel.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { chapters: true },
      },
    },
  });

  return (
    <div className="flex min-h-screen flex-col gap-8 bg-[#020202] px-6 py-8 text-zinc-100">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <p className="uppercase tracking-[0.3em]">wnreader</p>
          <SignOutButton />
        </div>
        <div className="text-2xl text-zinc-50">
          <p>Library</p>
          <p className="text-sm text-zinc-500">
            {novels.length ? `${novels.length} projects saved` : "Nothing yet"}
          </p>
        </div>
      </header>

      <EpubImport />

      <section className="flex flex-col divide-y divide-zinc-900 border border-zinc-900">
        {novels.length === 0 && (
          <p className="px-4 py-6 text-sm text-zinc-500">
            Imported chapters will show up here.
          </p>
        )}
        {novels.map((novel) => {
          const summary = novel.description
            ? String(novel.description).replace(/<[^>]+>/g, "").trim()
            : null;
          return (
            <div
              key={novel.id}
              className="flex flex-col gap-3 px-4 py-5 transition hover:bg-zinc-900/50 md:flex-row md:items-center"
            >
              <Link href={`/reader/${novel.id}`} className="flex flex-1 gap-4 text-left">
                <div className="h-20 w-16 flex-shrink-0 border border-zinc-800 bg-zinc-900/40">
                  {novel.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={novel.coverImage}
                      alt={`${novel.title} cover`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.3em] text-zinc-600">
                      no cover
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between text-sm text-zinc-500">
                    <span>{novel.author || "Unknown"}</span>
                    <span>{novel._count.chapters} chapters</span>
                  </div>
                  <h2 className="text-lg text-zinc-100">{novel.title}</h2>
                {summary && (
                  <p className="max-h-10 overflow-hidden text-ellipsis text-sm text-zinc-500">
                    {summary}
                  </p>
                )}
              </div>
            </Link>
              <LibraryItemActions novelId={novel.id} title={novel.title} />
            </div>
          );
        })}
      </section>
    </div>
  );
}
