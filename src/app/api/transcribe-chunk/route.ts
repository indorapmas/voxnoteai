import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase-server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function extractText(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object" && "text" in result) {
    return String((result as { text: unknown }).text);
  }
  return "";
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const chunk = formData.get("chunk") as File;
  const instructions = (formData.get("instructions") as string ?? "").trim();

  if (!chunk) return NextResponse.json({ text: "" });

  try {
    const bytes = await chunk.arrayBuffer();
    const audioFile = new File([bytes], "audio.webm", { type: "audio/webm" });

    // Step 1: Whisper — transcribe in whatever language was spoken
    const result = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "json",
      prompt: "If audio is unclear, transcribe what you can and summarize the main idea.",
    });

    let text = extractText(result).trim();
    if (!text) return NextResponse.json({ text: "" });

    // Step 2: If instructions given, let Claude process the text accordingly
    // e.g. "translate to thai", "translate to english", "summarize in chinese", etc.
    if (instructions) {
      try {
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: `You are processing a live transcript segment. Apply the user's instruction to this text.

User instruction: ${instructions}

Transcript segment: ${text}

Return ONLY the processed text. No explanations, no labels, no quotes.`,
          }],
        });
        const content = response.content[0];
        if (content.type === "text" && content.text.trim()) {
          text = content.text.trim();
        }
      } catch (err) {
        console.error("Claude processing error:", err);
        // Fall back to raw transcript
      }
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error("Chunk transcription error:", err);
    return NextResponse.json({ text: "" });
  }
}

export const maxDuration = 30;
