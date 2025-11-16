import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseEpub } from "@/lib/epub";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No EPUB provided." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const parsed = await parseEpub(buffer, file.name);

    const novel = await prisma.$transaction(async (tx) => {
      const novelRecord = await tx.novel.create({
        data: {
          title: parsed.title,
          author: parsed.author,
          description: parsed.description,
          userId: session.user.id,
        },
      });

      await tx.chapter.createMany({
        data: parsed.chapters.map((chapter, index) => ({
          novelId: novelRecord.id,
          title: chapter.title,
          content: chapter.content,
          position: index,
        })),
      });

      return novelRecord;
    });

    return NextResponse.json({ success: true, novelId: novel.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed." },
      { status: 400 }
    );
  }
}
