import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createAdminClient } from "@/lib/supabase-server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Check plan — video is paid only
  const { data: usage } = await admin
    .from("users_usage")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!usage || usage.plan === "free") {
    return NextResponse.json({ error: "Video recording requires a paid plan. Please upgrade." }, { status: 403 });
  }

  const formData = await req.formData();
  const video = formData.get("video") as File;
  const durationMinutes = Math.max(parseInt(formData.get("duration") as string ?? "1"), 1);
  const instructions = (formData.get("instructions") as string ?? "").trim();
  const liveTranscript = (formData.get("liveTranscript") as string ?? "").trim();

  if (!video) return NextResponse.json({ error: "No video file" }, { status: 400 });

  // Check minutes
  if (usage.minutes_used + durationMinutes > usage.minutes_limit) {
    return NextResponse.json({ error: "You have exceeded your monthly minutes limit. Please upgrade your plan." }, { status: 403 });
  }

  // Convert video to base64 for Gemini
  const videoBytes = await video.arrayBuffer();
  const videoBase64 = Buffer.from(videoBytes).toString("base64");
  const mimeType = "video/webm";

  // Step 1: Use live transcript if available, otherwise run Whisper
  let transcript = liveTranscript;
  if (!transcript) {
    try {
      const audioFile = new File([videoBytes], "audio.webm", { type: "audio/webm" });
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        response_format: "text",
      });
      transcript = transcription as unknown as string;
    } catch (err) {
      console.error("Whisper error:", err);
      // Continue without transcript — Gemini will still analyze video
    }
  }

  // Step 2: Analyze full video with Gemini
  let videoAnalysis = "";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: videoBase64,
        },
      },
      `Analyze this video recording in detail. Provide:
1. A description of what's happening visually (slides shown, screen content, demonstrations, body language if camera recording)
2. Key visual information shown (text on slides, diagrams, code, documents)
3. Any notable visual moments with approximate timestamps
4. Overall context of the meeting/session from visual cues

Be specific and detailed about visual content. This will be combined with audio transcription.`,
    ]);

    videoAnalysis = result.response.text();
  } catch (err) {
    console.error("Gemini error:", err);
    return NextResponse.json({ error: "Video analysis failed. Please try again." }, { status: 500 });
  }

  // Step 3: Generate combined notes with Claude
  let title = "Untitled Video Recording";
  let summary = "";
  let actionItems = "";

  const instructionsClause = instructions
    ? `\n\nSpecial focus instructions from the user: ${instructions}\nMake sure these are reflected in your summary and action items.`
    : "";

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `You are analyzing a recorded meeting or session that includes both audio and video.

${transcript ? `AUDIO TRANSCRIPT:\n${transcript.slice(0, 15000)}\n\n` : ""}VIDEO ANALYSIS:\n${videoAnalysis.slice(0, 10000)}
${instructionsClause}

Based on both the audio transcript and video analysis, return a JSON object with:
- "title": Short descriptive title (max 8 words)
- "summary": Comprehensive 3-5 sentence summary covering both spoken content and visual elements shown
- "action_items": Newline-separated action items starting with "- ". Empty string if none.

Return ONLY valid JSON, no markdown.`,
      }],
    });

    const content = response.content[0];
    if (content.type === "text") {
      const parsed = JSON.parse(content.text);
      title = parsed.title ?? "Untitled Video Recording";
      summary = parsed.summary ?? "";
      actionItems = parsed.action_items ?? "";
    }
  } catch (err) {
    console.error("Claude error:", err);
    title = "Video Recording";
    summary = videoAnalysis.slice(0, 500);
  }

  // Save recording
  const { error: insertError } = await admin.from("recordings").insert({
    user_id: user.id,
    title,
    duration_minutes: durationMinutes,
    transcript: transcript || videoAnalysis,
    summary,
    action_items: actionItems,
  });

  if (insertError) {
    console.error("Insert error:", insertError);
    return NextResponse.json({ error: "Failed to save recording: " + insertError.message }, { status: 500 });
  }

  // Update usage
  await admin.from("users_usage").upsert({
    user_id: user.id,
    minutes_used: usage.minutes_used + durationMinutes,
    minutes_limit: usage.minutes_limit,
  }, { onConflict: "user_id" });

  return NextResponse.json({ success: true, title, summary, action_items: actionItems });
}

export const maxDuration = 120;
