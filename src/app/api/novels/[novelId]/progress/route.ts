import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    novelId: string;
  }>;
};

const progressSchema = z.object({
  chapterId: z.string().cuid(),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { novelId } = await context.params;
    if (!novelId) {
      return NextResponse.json({ error: "Missing novel id" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = progressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid chapter id" }, { status: 400 });
    }

    const novel = await prisma.novel.findFirst({
      where: {
        id: novelId,
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (!novel) {
      return NextResponse.json({ error: "Novel not found" }, { status: 404 });
    }

    const chapter = await prisma.chapter.findFirst({
      where: {
        id: parsed.data.chapterId,
        novelId,
      },
      select: { id: true },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    await prisma.novel.update({
      where: { id: novelId },
      data: {
        lastReadChapterId: chapter.id,
        lastReadAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating reading progress:", error);
    return NextResponse.json(
      { error: "Failed to update reading progress" },
      { status: 500 }
    );
  }
}
