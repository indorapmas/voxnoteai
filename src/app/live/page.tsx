"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type LiveState = "setup" | "live" | "processing" | "done" | "error";

export default function LiveRecordingPage() {
  const router = useRouter();
  const [state, setState] = useState<LiveState>("setup");
  const [audioMode, setAudioMode] = useState<"mic" | "screen">("mic");
  const [aiInstructions, setAiInstructions] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<{ plan: string; minutes_used: number; minutes_limit: number } | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const headerChunkRef = useRef<Blob | null>(null);
  const pendingChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const secondsRef = useRef(0);
  const fullTranscriptRef = useRef("");
  const instructionsRef = useRef("");

  useEffect(() => { instructionsRef.current = aiInstructions; }, [aiInstructions]);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const res = await fetch("/api/usage");
      if (res.ok) setUsage(await res.json());
      setLoadingUsage(false);
    }
    checkAuth();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
    };
  }, [router]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, isTranscribing]);

  const isPaid = usage && usage.plan !== "free";
  const minutesLeft = usage ? usage.minutes_limit - usage.minutes_used : 0;

  const transcribeNewChunks = useCallback(async () => {
    if (!headerChunkRef.current || pendingChunksRef.current.length === 0) return;
    const newChunks = pendingChunksRef.current.splice(0);
    setIsTranscribing(true);
    try {
      const blob = new Blob([headerChunkRef.current, ...newChunks], { type: "audio/webm" });
      const fd = new FormData();
      fd.append("chunk", new File([blob], "audio.webm", { type: "audio/webm" }));
      if (instructionsRef.current) fd.append("instructions", instructionsRef.current);

      const res = await fetch("/api/transcribe-chunk", { method: "POST", body: fd });
      if (res.ok) {
        const { text } = await res.json();
        if (text && text.trim()) {
          fullTranscriptRef.current += (fullTranscriptRef.current ? " " : "") + text.trim();
          setTranscript(fullTranscriptRef.current);
        }
      }
    } catch (e) {
      console.error("Live transcription error:", e);
    }
    setIsTranscribing(false);
  }, []);

  async function startLive() {
    setError("");
    setTranscript("");
    fullTranscriptRef.current = "";
    chunksRef.current = [];
    headerChunkRef.current = null;
    pendingChunksRef.current = [];
    secondsRef.current = 0;

    try {
      let stream: MediaStream;
      if (audioMode === "screen") {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const audioTracks = display.getAudioTracks();
        if (audioTracks.length === 0) {
          display.getTracks().forEach(t => t.stop());
          setError("No audio detected. Check \"Share tab audio\" when prompted.");
          return;
        }
        stream = new MediaStream(audioTracks);
        display.getVideoTracks().forEach(t => t.stop());
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          if (!headerChunkRef.current) {
            headerChunkRef.current = e.data;
          } else {
            pendingChunksRef.current.push(e.data);
          }
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setState("live");
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds(s => { secondsRef.current = s + 1; return s + 1; });
      }, 1000);
      chunkTimerRef.current = setInterval(transcribeNewChunks, 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not access microphone");
    }
  }

  async function endSession() {
    if (!mediaRecorderRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    setState("processing");

    await new Promise<void>(resolve => {
      mediaRecorderRef.current!.onstop = () => resolve();
      mediaRecorderRef.current!.stop();
    });

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const fd = new FormData();
    fd.append("audio", blob, "recording.webm");
    fd.append("duration", String(Math.max(Math.ceil(seconds / 60), 1)));
    fd.append("type", "audio");
    if (aiInstructions.trim()) fd.append("instructions", aiInstructions.trim());
    if (fullTranscriptRef.current.trim()) fd.append("liveTranscript", fullTranscriptRef.current.trim());

    try {
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!res.ok) {
        const { error } = await res.json();
        setError(error || "Processing failed");
        setState("error");
        return;
      }
      setState("done");
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch {
      setError("Upload failed. Please try again.");
      setState("error");
    }
  }

  function formatTime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  // ── SETUP ──
  if (state === "setup") {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
          {usage && (
            <span className={`text-xs ${minutesLeft < 5 ? "text-red-400" : "text-zinc-500"}`}>
              {minutesLeft} min remaining
            </span>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="mb-10 text-center">
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <div className="w-5 h-5 bg-red-500 rounded-full animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Live Recording</h1>
              <p className="text-zinc-500 text-sm">Real-time transcript as you speak</p>
            </div>

            {loadingUsage ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-700 border-t-red-500 rounded-full animate-spin" />
              </div>
            ) : !isPaid ? (
              <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center">
                <p className="text-zinc-700 dark:text-zinc-300 font-medium mb-2">Paid plan required</p>
                <p className="text-zinc-500 text-sm mb-4">Live recording is available on Starter and above</p>
                <Link href="/plans" className="bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors inline-block">
                  View plans
                </Link>
              </div>
            ) : minutesLeft <= 0 ? (
              <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center">
                <p className="text-zinc-700 dark:text-zinc-300 font-medium mb-2">No minutes remaining</p>
                <Link href="/plans" className="bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors inline-block mt-2">
                  Upgrade plan
                </Link>
              </div>
            ) : (
              <>
                {/* Source */}
                <div className="flex gap-2 mb-5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1">
                  <button
                    onClick={() => setAudioMode("mic")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${audioMode === "mic" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    Microphone
                  </button>
                  <button
                    onClick={() => setAudioMode("screen")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${audioMode === "screen" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    System Audio
                  </button>
                </div>

                {audioMode === "screen" && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-600 text-center mb-5 -mt-2">
                    Check <strong className="text-zinc-700 dark:text-zinc-400">"Share tab audio"</strong> for Zoom, Meet, or Teams
                  </p>
                )}

                {/* AI Instructions */}
                <div className="mb-8">
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                    AI Instructions <span className="text-zinc-400 dark:text-zinc-600 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={aiInstructions}
                    onChange={e => setAiInstructions(e.target.value)}
                    placeholder={"e.g. \"Translate to Thai\"\ne.g. \"แปลเป็นภาษาไทย\"\ne.g. \"Extract all action items and owners\"\ne.g. \"Summarize key decisions\""}
                    rows={3}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-red-500/60 resize-none transition-colors"
                  />
                </div>

                {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

                <button
                  onClick={startLive}
                  className="w-full bg-red-500 hover:bg-red-600 active:scale-[0.98] transition-all text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 text-base shadow-lg shadow-red-500/20"
                >
                  <div className="w-3 h-3 bg-white rounded-full" />
                  Start Live Recording
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── LIVE ──
  if (state === "live") {
    return (
      <div className="h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 border-b border-zinc-200 dark:border-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-full px-3 py-1.5">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-500 dark:text-red-400 text-xs font-semibold tracking-wide uppercase">Live</span>
            </div>
            <span className="text-2xl font-mono font-bold tabular-nums">{formatTime(seconds)}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={endSession}
              className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <div className="w-3 h-3 bg-zinc-800 dark:bg-white rounded-sm" />
              End session
            </button>
          </div>
        </div>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {!transcript ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="flex items-end justify-center gap-1.5 h-16 mb-6">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-red-500 rounded-full opacity-80"
                    style={{
                      height: `${Math.sin(i * 0.7) * 24 + 28}px`,
                      animation: `pulse ${0.8 + (i % 5) * 0.15}s ease-in-out infinite alternate`,
                      animationDelay: `${i * 60}ms`,
                    }}
                  />
                ))}
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-lg font-medium mb-2">Listening...</p>
              <p className="text-zinc-400 dark:text-zinc-600 text-sm">Transcript appears after ~15 seconds</p>
              {aiInstructions && (
                <p className="text-zinc-400 dark:text-zinc-700 text-xs mt-4 max-w-xs">
                  Focus: <span className="text-zinc-500">{aiInstructions}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto pt-8">
              <p className="text-zinc-800 dark:text-zinc-100 text-xl leading-relaxed font-light">
                {transcript}
                <span className="inline-block w-0.5 h-5 bg-red-400 ml-1 align-middle animate-pulse" />
              </p>

              <div className="flex items-center gap-2 mt-6 text-xs">
                {isTranscribing ? (
                  <>
                    <div className="flex gap-1">
                      <span className="w-1 h-1 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1 h-1 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1 h-1 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-zinc-500 dark:text-zinc-600">Processing...</span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 bg-red-500/60 rounded-full animate-pulse" />
                    <span className="text-zinc-400 dark:text-zinc-700">Listening...</span>
                  </>
                )}
              </div>

              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-900 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-zinc-400 dark:text-zinc-600">
            {audioMode === "mic" ? "Microphone" : "System audio"} · {minutesLeft} min left
          </span>
          {aiInstructions && (
            <span className="text-xs text-zinc-400 dark:text-zinc-600 truncate max-w-xs ml-4">
              Focus: <span className="text-zinc-500">{aiInstructions}</span>
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── PROCESSING ──
  if (state === "processing") {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-lg font-semibold mb-2">Generating your notes</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Claude is analyzing your session...</p>
        </div>
      </div>
    );
  }

  // ── DONE ──
  if (state === "done") {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">Notes ready!</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // ── ERROR ──
  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
        <p className="text-red-400 text-sm mb-6">{error}</p>
        <button onClick={() => { setState("setup"); setError(""); }} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
          Try again
        </button>
      </div>
    </div>
  );
}
