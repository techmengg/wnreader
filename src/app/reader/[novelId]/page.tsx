import { notFound, redirect } from "next/navigation";
import { ReaderView } from "@/components/reader-view";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ReaderPageProps = {
  params: Promise<{
    novelId: string;
  }>;
  searchParams: Promise<{
    chapter?: string;
  }>;
};

// Enable static optimization where possible
export const dynamic = 'force-dynamic'; // Required due to auth check
export const revalidate = 0;

export default async function ReaderPage({ params, searchParams }: ReaderPageProps) {
  const { novelId } = await params;
  const search = await searchParams;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Optimized query - select only needed fields
  const novel = await prisma.novel.findFirst({
    where: {
      id: novelId,
      userId: session.user.id,
    },
    select: {
      id: true,
      title: true,
      author: true,
      description: true,
      coverImage: true,
      lastReadChapterId: true,
      chapters: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          content: true,
        },
      },
    },
  });

  if (!novel) {
    notFound();
  }

  const requestedIndex = Number(search.chapter);
  const totalChapters = novel.chapters.length;
  const clampedRequested =
    Number.isFinite(requestedIndex) && totalChapters > 0
      ? Math.min(Math.max(requestedIndex, 0), totalChapters - 1)
      : null;

  let initialIndex = clampedRequested ?? 0;

  if (clampedRequested === null && novel.lastReadChapterId && totalChapters > 0) {
    const lastIndex = novel.chapters.findIndex(
      (chapter) => chapter.id === novel.lastReadChapterId
    );
    if (lastIndex >= 0) {
      initialIndex = lastIndex;
    }
  }

  return <ReaderView novel={novel} initialIndex={initialIndex} />;
}
