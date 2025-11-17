import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createUploadUrl } from "@/lib/storage";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { filename, contentType } = body as {
    filename?: string;
    contentType?: string;
  };

  if (!filename || !contentType) {
    return NextResponse.json(
      { error: "filename and contentType are required." },
      { status: 400 }
    );
  }

  const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${session.user.id}/${Date.now()}-${cleanFilename}`;

  try {
    const uploadUrl = await createUploadUrl({
      key,
      contentType,
    });

    return NextResponse.json({ uploadUrl, key });
  } catch (error) {
    console.error("Failed to create upload URL:", error);
    return NextResponse.json(
      { error: "Failed to create upload URL." },
      { status: 500 }
    );
  }
}

