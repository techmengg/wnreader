import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  language?: string;
  labels?: Record<string, string>;
  description?: string;
  preview_url?: string;
}

interface ElevenLabsVoicesResponse {
  voices?: ElevenLabsVoice[];
}

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs API key is not configured." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text();
      return NextResponse.json(
        {
          error: "Failed to fetch voices from ElevenLabs.",
          details: message,
        },
        { status: response.status }
      );
    }

    const data = (await response.json()) as ElevenLabsVoicesResponse;
    const voices = (data.voices ?? []).map((voice) => ({
      id: voice.voice_id,
      name: voice.name,
      category: voice.category ?? "general",
      description: voice.description ?? null,
      language:
        voice.language ??
        voice.labels?.language ??
        voice.labels?.accent ??
        "en",
      previewUrl: voice.preview_url ?? null,
    }));

    return NextResponse.json({ voices });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected error fetching ElevenLabs voices.",
        details: error instanceof Error ? error.message : String(error),
      },
        { status: 500 }
    );
  }
}
