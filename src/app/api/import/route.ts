import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseEpub } from "@/lib/epub";
import { createDownloadUrl } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";

    // New path: JSON body referencing an object in external storage
    if (contentType.startsWith("application/json")) {
      const body = (await request.json().catch(() => null)) as
        | { key?: string; filename?: string }
        | null;

      if (!body?.key || !body.filename) {
        return NextResponse.json(
          { error: "key and filename are required." },
          { status: 400 }
        );
      }

      const downloadUrl = await createDownloadUrl({ key: body.key });
      const fileResponse = await fetch(downloadUrl);

      if (!fileResponse.ok) {
        return NextResponse.json(
          { error: "Failed to download EPUB from storage." },
          { status: 502 }
        );
      }

      const arrayBuffer = await fileResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const parsed = await parseEpub(buffer, body.filename);

      const novel = await prisma.$transaction(
        async (tx) => {
          const novelRecord = await tx.novel.create({
            data: {
              title: parsed.title,
              author: parsed.author,
              description: parsed.description,
              coverImage: parsed.coverImage,
              userId: session.user.id,
            },
          });

          if (parsed.chapters.length > 0) {
            await tx.chapter.createMany({
              data: parsed.chapters.map((chapter, index) => ({
                novelId: novelRecord.id,
                title: chapter.title,
                content: chapter.content,
                position: index,
              })),
            });
          }

          return novelRecord;
        },
        {
          timeout: 120000,
          maxWait: 10000,
        }
      );

      return NextResponse.json({ success: true, novelId: novel.id });
    }

    // Fallback path: small files uploaded directly as form-data
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No EPUB provided." }, { status: 400 });
    }

    // Validate file size (for direct uploads via Vercel)
    const MAX_FILE_SIZE = 4 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 4MB." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".epub") && file.type !== "application/epub+zip") {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an EPUB file." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseEpub(buffer, file.name);

    const novel = await prisma.$transaction(
      async (tx) => {
        const novelRecord = await tx.novel.create({
          data: {
            title: parsed.title,
            author: parsed.author,
            description: parsed.description,
            coverImage: parsed.coverImage,
            userId: session.user.id,
          },
        });

        if (parsed.chapters.length > 0) {
          await tx.chapter.createMany({
            data: parsed.chapters.map((chapter, index) => ({
              novelId: novelRecord.id,
              title: chapter.title,
              content: chapter.content,
              position: index,
            })),
          });
        }

        return novelRecord;
      },
      {
        timeout: 120000,
        maxWait: 10000,
      }
    );

    return NextResponse.json({ success: true, novelId: novel.id });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Import failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
