import Link from "next/link";
import { redirect } from "next/navigation";
import { EpubImport } from "@/components/epub-import";
import { SignOutButton } from "@/components/sign-out-button";
import { LibraryItemActions } from "@/components/library-item-actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Enable dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LibraryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Optimized query with indexed fields
  const novels = await prisma.novel.findMany({
    where: { userId: session.user.id! },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      author: true,
      description: true,
      coverImage: true,
      updatedAt: true,
      lastReadAt: true,
      lastReadChapter: {
        select: {
          id: true,
          title: true,
          position: true,
        },
      },
      _count: {
        select: { chapters: true },
      },
    },
  });

  return (
    <div className="flex min-h-screen flex-col gap-4 md:gap-8 bg-[#020202] px-3 md:px-6 py-4 md:py-8 text-zinc-100">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs md:text-sm text-zinc-500">
          <p className="uppercase tracking-[0.25em] md:tracking-[0.3em]">wnreader</p>
          <SignOutButton />
        </div>
        <div className="text-xl md:text-2xl text-zinc-50">
          <p>Library</p>
          <p className="text-xs md:text-sm text-zinc-500">
            {novels.length ? `${novels.length} projects saved` : "Nothing yet"}
          </p>
        </div>
      </header>

      <EpubImport />

      <section className="flex flex-col divide-y divide-zinc-900 border border-zinc-900">
        {novels.length === 0 && (
          <p className="px-3 md:px-4 py-4 md:py-6 text-xs md:text-sm text-zinc-500">
            Imported chapters will show up here.
          </p>
        )}
        {novels.map((novel) => {
          const summary = novel.description
            ? String(novel.description).replace(/<[^>]+>/g, "").trim()
            : null;
          const totalChapters = novel._count.chapters;
          const lastReadPosition = novel.lastReadChapter?.position ?? null;
          const currentChapterNumber =
            typeof lastReadPosition === "number"
              ? Math.min(lastReadPosition + 1, totalChapters)
              : 0;
          const progressLabel =
            totalChapters > 0 ? `${currentChapterNumber}/${totalChapters}` : "0/0";
          return (
            <div
              key={novel.id}
              className="flex flex-col gap-2 md:gap-3 px-3 md:px-4 py-3 md:py-5 transition hover:bg-zinc-900/50 md:flex-row md:items-center"
            >
              <Link href={`/reader/${novel.id}`} className="flex flex-1 gap-2 md:gap-4 text-left">
                <div className="h-16 w-12 md:h-20 md:w-16 flex-shrink-0 border border-zinc-800 bg-zinc-900/40">
                  {novel.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={novel.coverImage}
                      alt={`${novel.title} cover`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[8px] md:text-[10px] uppercase tracking-[0.25em] md:tracking-[0.3em] text-zinc-600">
                      no cover
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-0.5 md:gap-1">
                  <div className="flex items-center justify-between text-xs md:text-sm text-zinc-500">
                    <span className="truncate">{novel.author || "Unknown"}</span>
                    <span className="ml-2 flex-shrink-0">
                      {progressLabel}
                      {novel.lastReadChapter?.title && (
                        <span className="ml-1 hidden text-[10px] uppercase tracking-[0.25em] text-zinc-600 md:inline">
                          {novel.lastReadChapter.title}
                        </span>
                      )}
                    </span>
                  </div>
                  <h2 className="text-sm md:text-lg text-zinc-100 leading-tight">{novel.title}</h2>
                {summary && (
                  <p className="max-h-8 md:max-h-10 overflow-hidden text-ellipsis text-xs md:text-sm text-zinc-500 leading-snug">
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
