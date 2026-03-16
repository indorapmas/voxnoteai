import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createAdminClient } from "@/lib/supabase-server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Get usage
  const { data: usage } = await admin
    .from("users_usage")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!usage) {
    // Create usage row for new user
    await admin.from("users_usage").insert({ user_id: user.id });
  }

  const currentUsage = usage ?? { minutes_used: 0, minutes_limit: 10 };

  const formData = await req.formData();
  const audio = formData.get("audio") as File;
  const durationMinutes = parseInt(formData.get("duration") as string ?? "1");
  const instructions = (formData.get("instructions") as string ?? "").trim();
  const liveTranscript = (formData.get("liveTranscript") as string ?? "").trim();

  if (!audio) return NextResponse.json({ error: "No audio file" }, { status: 400 });

  // Check minutes
  if (currentUsage.minutes_used + durationMinutes > currentUsage.minutes_limit) {
    return NextResponse.json({ error: "You have exceeded your monthly minutes limit. Please upgrade your plan." }, { status: 403 });
  }

  // Use live transcript if available (already transcribed in real-time), otherwise run Whisper
  let transcript = liveTranscript;
  if (!transcript) {
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: audio,
        model: "whisper-1",
        response_format: "text",
      });
      transcript = transcription as unknown as string;
    } catch (err) {
      console.error("Whisper error:", err);
      return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
    }
  }

  if (!transcript || transcript.trim().length === 0) {
    return NextResponse.json({ error: "No speech detected in recording" }, { status: 400 });
  }

  // Summarize with Claude Haiku
  let summary = "";
  let actionItems = "";
  let title = "";

  const instructionsClause = instructions
    ? `\n\nSpecial focus instructions from the user: ${instructions}\nMake sure these are reflected in your summary and action items.`
    : "";

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `You are a meeting notes assistant. Analyze this transcript and return a JSON object with these exact keys:
- "title": A short, descriptive title for this recording (max 8 words)
- "summary": A clear 2-4 sentence summary of what was discussed
- "action_items": Action items as a newline-separated list, each starting with "- ". If none, return empty string.
${instructionsClause}

Transcript:
${transcript.slice(0, 20000)}

Return ONLY valid JSON, no markdown, no explanation.`
      }],
    });

    const content = response.content[0];
    if (content.type === "text") {
      const parsed = JSON.parse(content.text);
      title = parsed.title ?? "Untitled Recording";
      summary = parsed.summary ?? "";
      actionItems = parsed.action_items ?? "";
    }
  } catch (err) {
    console.error("Claude error:", err);
    title = "Untitled Recording";
    summary = transcript.slice(0, 300) + "...";
    actionItems = "";
  }

  // Save recording
  const { error: insertError } = await admin.from("recordings").insert({
    user_id: user.id,
    title,
    duration_minutes: Math.max(durationMinutes, 1),
    transcript,
    summary,
    action_items: actionItems,
  });

  if (insertError) {
    console.error("Insert error:", insertError);
    return NextResponse.json({ error: "Failed to save recording: " + insertError.message }, { status: 500 });
  }

  // Update usage
  await admin.from("users_usage")
    .upsert({
      user_id: user.id,
      minutes_used: currentUsage.minutes_used + Math.max(durationMinutes, 1),
      minutes_limit: currentUsage.minutes_limit,
    }, { onConflict: "user_id" });

  return NextResponse.json({ success: true, title, summary, action_items: actionItems });
}

export const maxDuration = 60;
