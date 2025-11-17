import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface ElevenLabsRequestBody {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs API key is not configured." },
      { status: 500 }
    );
  }

  let payload: ElevenLabsRequestBody;

  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON payload.", details: String(error) },
      { status: 400 }
    );
  }

  const text = (payload.text ?? "").trim();
  if (!text) {
    return NextResponse.json(
      { error: "Text is required for speech synthesis." },
      { status: 400 }
    );
  }

  const voiceId =
    payload.voiceId ?? process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? "";

  if (!voiceId) {
    return NextResponse.json(
      { error: "No ElevenLabs voice ID provided." },
      { status: 400 }
    );
  }

  const truncatedText = text.slice(0, 5000);
  const modelId =
    payload.modelId ??
    process.env.ELEVENLABS_MODEL_ID ??
    "eleven_multilingual_v2";

  try {
    const elevenResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: truncatedText,
          model_id: modelId,
          voice_settings: {
            stability: payload.stability ?? 0.5,
            similarity_boost: payload.similarityBoost ?? 0.75,
          },
        }),
      }
    );

    if (!elevenResponse.ok) {
      const message = await elevenResponse.text();
      return NextResponse.json(
        {
          error: "Failed to synthesize speech with ElevenLabs.",
          details: message,
        },
        { status: elevenResponse.status }
      );
    }

    const audioBuffer = await elevenResponse.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected error communicating with ElevenLabs.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
