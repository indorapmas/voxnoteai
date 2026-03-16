import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createAdminClient } from "@/lib/supabase-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("messages")
    .select("*")
    .eq("recording_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const admin = createAdminClient();

  // Get recording transcript
  const { data: recording } = await admin
    .from("recordings")
    .select("transcript, title, summary")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!recording) return NextResponse.json({ error: "Recording not found" }, { status: 404 });

  // Get existing messages
  const { data: history } = await admin
    .from("messages")
    .select("role, content")
    .eq("recording_id", id)
    .order("created_at", { ascending: true });

  // Save user message
  await admin.from("messages").insert({ recording_id: id, role: "user", content: message });

  // Build messages for Claude
  const messages = [
    ...(history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];

  // Stream response
  const stream = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: `You are a helpful assistant answering questions about a recorded meeting or call.

Title: ${recording.title}
Summary: ${recording.summary}

Full transcript:
${(recording.transcript ?? "").slice(0, 20000)}

Answer questions based on the transcript above. Be concise and specific. If the answer isn't in the transcript, say so.`,
    messages,
    stream: true,
  });

  // Stream the response back
  const encoder = new TextEncoder();
  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          const text = event.delta.text;
          fullResponse += text;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
      }
      // Save assistant response
      await admin.from("messages").insert({ recording_id: id, role: "assistant", content: fullResponse });
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

export const maxDuration = 60;
