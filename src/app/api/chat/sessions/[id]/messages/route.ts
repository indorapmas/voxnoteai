import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient, createAdminClient } from "@/lib/supabase-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("chat_messages")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Get user plan
  const { data: usage } = await admin
    .from("users_usage")
    .select("plan")
    .eq("user_id", user.id)
    .single();
  const isPaid = usage?.plan && usage.plan !== "free";

  const formData = await req.formData();
  const message = formData.get("message") as string ?? "";
  const file = formData.get("file") as File | null;

  let fileType = "";
  let fileName = "";
  let fileContext = "";
  let claudeImageContent: Anthropic.ImageBlockParam | null = null;

  if (file) {
    fileType = file.type;
    fileName = file.name;
    const fileBytes = await file.arrayBuffer();
    const fileBase64 = Buffer.from(fileBytes).toString("base64");

    if (fileType.startsWith("image/")) {
      // Image → Claude Vision
      claudeImageContent = {
        type: "image",
        source: {
          type: "base64",
          media_type: fileType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: fileBase64,
        },
      };

      // Also run Google Vision web detection for reverse image search context
      if (process.env.GOOGLE_VISION_API_KEY) {
        try {
          const visionRes = await fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                requests: [{
                  image: { content: fileBase64 },
                  features: [{ type: "WEB_DETECTION", maxResults: 10 }],
                }],
              }),
            }
          );
          const visionData = await visionRes.json();
          const web = visionData.responses?.[0]?.webDetection;
          if (web) {
            const parts: string[] = [];
            if (web.bestGuessLabels?.length)
              parts.push(`Best guess: ${web.bestGuessLabels.map((l: { label: string }) => l.label).join(", ")}`);
            if (web.webEntities?.length)
              parts.push(`Web entities: ${web.webEntities.slice(0, 8).map((e: { description: string; score: number }) => `${e.description} (${e.score.toFixed(2)})`).join(", ")}`);
            if (web.pagesWithMatchingImages?.length)
              parts.push(`Found on pages: ${web.pagesWithMatchingImages.slice(0, 3).map((p: { url: string; pageTitle?: string }) => p.pageTitle ? `${p.pageTitle} — ${p.url}` : p.url).join(" | ")}`);
            if (parts.length)
              fileContext = `[Google Vision Web Detection]\n${parts.join("\n")}`;
          }
        } catch (err) {
          console.error("Google Vision error:", err);
        }
      }
    } else if (fileType.startsWith("video/")) {
      if (isPaid) {
        // Paid plan → full Gemini video analysis
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
          const result = await model.generateContent([
            { inlineData: { mimeType: fileType, data: fileBase64 } },
            "Analyze this video in detail. Describe what's happening, any text or slides visible, key moments, and overall content.",
          ]);
          fileContext = `[Video Analysis by Gemini AI]\n${result.response.text()}`;
        } catch (err) {
          console.error("Gemini error:", err);
          fileContext = "[Video analysis failed. Please try again.]";
        }
      } else {
        // Free plan → audio only via Whisper
        try {
          const audioFile = new File([fileBytes], "audio.webm", { type: "audio/webm" });
          const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            response_format: "text",
          });
          fileContext = `[Audio transcribed from video — upgrade to Pro for full video analysis]\nTranscript: ${transcription}`;
        } catch (err) {
          console.error("Whisper error:", err);
          fileContext = "[Could not extract audio from video.]";
        }
      }
    }
  }

  // Get chat history
  const { data: history } = await admin
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  // Save user message
  const userContent = [
    file ? `[Attached: ${fileName}]` : "",
    fileContext,
    message,
  ].filter(Boolean).join("\n\n");

  await admin.from("chat_messages").insert({
    session_id: id,
    role: "user",
    content: message || `Attached: ${fileName}`,
    file_type: fileType || null,
    file_name: fileName || null,
  });

  // Auto-title session after first message
  if (!history || history.length === 0) {
    const titleText = message || fileName || "File analysis";
    const shortTitle = titleText.slice(0, 50);
    await admin.from("chat_sessions").update({ title: shortTitle }).eq("id", id);
  }

  // Build Claude messages
  const claudeMessages: Anthropic.MessageParam[] = [
    ...(history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  // Add current message with optional image
  if (claudeImageContent) {
    const textParts = [fileContext, message || "Analyze this image."].filter(Boolean).join("\n\n");
    claudeMessages.push({
      role: "user",
      content: [
        claudeImageContent,
        { type: "text", text: textParts },
      ],
    });
  } else {
    claudeMessages.push({
      role: "user",
      content: userContent || message,
    });
  }

  const systemPrompt = "You are a helpful AI assistant with web search. You can analyze images, videos (via transcripts or Gemini analysis), and answer any questions. Be clear, concise, and format responses with markdown when helpful.";

  const encoder = new TextEncoder();
  let fullResponse = "";
  let isSearching = false;

  const stream = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    messages: claudeMessages,
    tools: [{ type: "web_search_20250305", name: "web_search" } as unknown as Anthropic.Tool],
    stream: true,
  });

  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === "content_block_start") {
          if (event.content_block.type === "tool_use" && event.content_block.name === "web_search") {
            isSearching = true;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ searching: true })}\n\n`));
          } else if (isSearching && event.content_block.type === "text") {
            isSearching = false;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ searching: false })}\n\n`));
          }
        }
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          const text = event.delta.text;
          fullResponse += text;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
      }

      await admin.from("chat_messages").insert({ session_id: id, role: "assistant", content: fullResponse });
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

export const maxDuration = 120;
