"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type RecordingState = "idle" | "recording" | "processing" | "done" | "error";
type RecordType = "audio" | "video";
type AudioMode = "mic" | "screen";
type VideoMode = "camera" | "screen";

export default function RecordPage() {
  const router = useRouter();
  const [state, setState] = useState<RecordingState>("idle");
  const [recordType, setRecordType] = useState<RecordType>("audio");
  const [audioMode, setAudioMode] = useState<AudioMode>("mic");
  const [videoMode, setVideoMode] = useState<VideoMode>("camera");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<{ minutes_used: number; minutes_limit: number; plan: string } | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [aiInstructions, setAiInstructions] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

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
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [router]);

  const isPaidPlan = usage && usage.plan !== "free";
  const minutesLeft = usage ? usage.minutes_limit - usage.minutes_used : 0;

  async function startRecording() {
    setError("");
    chunksRef.current = [];
    try {
      let stream: MediaStream;

      if (recordType === "audio") {
        if (audioMode === "screen") {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          const audioTracks = displayStream.getAudioTracks();
          if (audioTracks.length === 0) {
            displayStream.getTracks().forEach(t => t.stop());
            setError("No audio detected. Check \"Share tab audio\" when prompted.");
            return;
          }
          stream = new MediaStream(audioTracks);
          displayStream.getVideoTracks().forEach(t => t.stop());
        } else {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      } else {
        if (videoMode === "screen") {
          stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: true });
        } else {
          stream = await navigator.mediaDevices.getUserMedia({ video: { frameRate: 15 }, audio: true });
        }
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play();
        }
      }

      streamRef.current = stream;
      const mimeType = recordType === "video" ? "video/webm;codecs=vp9,opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not access media device");
    }
  }

  async function stopRecording() {
    if (!mediaRecorderRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
    setState("processing");

    await new Promise<void>(resolve => {
      mediaRecorderRef.current!.onstop = () => resolve();
      mediaRecorderRef.current!.stop();
    });

    const isVideo = recordType === "video";
    const blob = new Blob(chunksRef.current, { type: isVideo ? "video/webm" : "audio/webm" });
    const fd = new FormData();
    fd.append(isVideo ? "video" : "audio", blob, "recording.webm");
    fd.append("duration", String(Math.max(Math.ceil(seconds / 60), 1)));
    fd.append("type", recordType);
    if (aiInstructions.trim()) fd.append("instructions", aiInstructions.trim());

    try {
      const res = await fetch(isVideo ? "/api/analyze-video" : "/api/transcribe", { method: "POST", body: fd });
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
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>
        {state === "recording" ? (
          <div className={`flex items-center gap-2 text-sm font-medium ${recordType === "video" ? "text-blue-400" : "text-red-400"}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${recordType === "video" ? "bg-blue-500" : "bg-red-500"}`} />
            {formatTime(seconds)}
          </div>
        ) : (
          usage && (
            <span className={`text-xs ${minutesLeft < 5 ? "text-red-400" : "text-zinc-500"}`}>
              {minutesLeft} min remaining
            </span>
          )
        )}
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">

          {/* ── IDLE ── */}
          {state === "idle" && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">New Recording</h1>
                <p className="text-zinc-400 text-sm">
                  Record and get AI notes.{" "}
                  <Link href="/live" className="text-red-400 hover:text-red-300 transition-colors">
                    Want live transcript?
                  </Link>
                </p>
              </div>

              {loadingUsage ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
                </div>
              ) : minutesLeft <= 0 ? (
                <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 text-center">
                  <p className="text-zinc-700 dark:text-zinc-300 font-medium mb-2">No minutes remaining</p>
                  <Link href="/plans" className="bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors inline-block mt-2">
                    Upgrade plan
                  </Link>
                </div>
              ) : (
                <>
                  {/* Type selector */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <button
                      onClick={() => setRecordType("audio")}
                      className={`relative rounded-2xl p-5 border-2 text-left transition-all ${
                        recordType === "audio" ? "border-violet-500 bg-violet-500/10" : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${recordType === "audio" ? "bg-violet-500/20" : "bg-zinc-200 dark:bg-zinc-800"}`}>
                        <svg className={`w-5 h-5 ${recordType === "audio" ? "text-violet-500 dark:text-violet-400" : "text-zinc-500 dark:text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      <p className="font-semibold text-sm mb-0.5">Audio</p>
                      <p className="text-xs text-zinc-500">Mic or system audio</p>
                      {recordType === "audio" && (
                        <div className="absolute top-3 right-3 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>

                    <button
                      onClick={() => { if (isPaidPlan) setRecordType("video"); }}
                      className={`relative rounded-2xl p-5 border-2 text-left transition-all ${
                        !isPaidPlan
                          ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 opacity-60 cursor-not-allowed"
                          : recordType === "video"
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${recordType === "video" && isPaidPlan ? "bg-blue-500/20" : "bg-zinc-200 dark:bg-zinc-800"}`}>
                        <svg className={`w-5 h-5 ${recordType === "video" && isPaidPlan ? "text-blue-400" : "text-zinc-500 dark:text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="font-semibold text-sm mb-0.5">Video</p>
                      <p className="text-xs text-zinc-500">Camera or screen</p>
                      {!isPaidPlan && (
                        <span className="absolute top-3 right-3 bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full border border-yellow-500/30">Pro+</span>
                      )}
                      {recordType === "video" && isPaidPlan && (
                        <div className="absolute top-3 right-3 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Source sub-selector */}
                  {recordType === "audio" && (
                    <div className="flex gap-2 mb-5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1">
                      <button onClick={() => setAudioMode("mic")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${audioMode === "mic" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        Microphone
                      </button>
                      <button onClick={() => setAudioMode("screen")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${audioMode === "screen" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        System Audio
                      </button>
                    </div>
                  )}

                  {recordType === "video" && isPaidPlan && (
                    <div className="flex gap-2 mb-5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1">
                      <button onClick={() => setVideoMode("camera")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${videoMode === "camera" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Camera
                      </button>
                      <button onClick={() => setVideoMode("screen")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${videoMode === "screen" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Screen
                      </button>
                    </div>
                  )}

                  {/* Hints */}
                  {recordType === "audio" && audioMode === "screen" && (
                    <p className="text-xs text-zinc-500 mb-5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-center">
                      When prompted, check <strong className="text-zinc-700 dark:text-zinc-300">"Share tab audio"</strong> to capture Zoom, Meet, or Teams audio.
                    </p>
                  )}
                  {recordType === "video" && isPaidPlan && (
                    <p className="text-xs text-zinc-500 mb-5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-center">
                      {videoMode === "screen"
                        ? "Gemini AI will analyze your screen — slides, demos, and all visual content."
                        : "Gemini AI will analyze your camera recording — content and spoken audio."}
                    </p>
                  )}
                  {!isPaidPlan && (
                    <p className="text-center text-xs text-zinc-500 dark:text-zinc-600 mb-5">
                      <Link href="/plans" className="text-violet-500 dark:text-violet-400 hover:text-violet-600 dark:hover:text-violet-300">Upgrade to Pro</Link> to unlock video recording with full AI analysis
                    </p>
                  )}

                  {/* AI Instructions */}
                  <div className="mb-6">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                      AI Instructions <span className="text-zinc-400 dark:text-zinc-600 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={aiInstructions}
                      onChange={e => setAiInstructions(e.target.value)}
                      placeholder={"What should AI focus on?\ne.g. \"Extract all action items and owners\"\ne.g. \"Summarize pricing and key decisions\""}
                      rows={3}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none transition-colors"
                    />
                  </div>

                  {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

                  <div className="text-center">
                    <button
                      onClick={startRecording}
                      className={`w-20 h-20 transition-all rounded-full flex items-center justify-center mx-auto shadow-lg hover:scale-105 active:scale-95 ${
                        recordType === "video"
                          ? "bg-blue-500 hover:bg-blue-600 shadow-blue-500/30"
                          : "bg-red-500 hover:bg-red-600 shadow-red-500/30"
                      }`}
                    >
                      {recordType === "video" ? (
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                      ) : (
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="6" />
                        </svg>
                      )}
                    </button>
                    <p className="text-zinc-500 text-sm mt-3">Tap to start {recordType} recording</p>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── RECORDING ── */}
          {state === "recording" && (
            <div className="text-center">
              {/* Video preview */}
              {recordType === "video" && (
                <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 aspect-video max-w-sm mx-auto mb-8">
                  <video ref={videoPreviewRef} muted className="w-full h-full object-cover" />
                </div>
              )}

              {/* Audio waveform */}
              {recordType === "audio" && (
                <div className="flex items-end justify-center gap-1 h-14 mb-8">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-red-500 rounded-full opacity-75"
                      style={{
                        height: `${Math.sin(i * 0.8) * 20 + 24}px`,
                        animation: `pulse ${0.7 + (i % 4) * 0.15}s ease-in-out infinite alternate`,
                        animationDelay: `${i * 50}ms`,
                      }}
                    />
                  ))}
                </div>
              )}

              <p className="text-zinc-500 text-sm mb-2">
                {recordType === "video"
                  ? (videoMode === "camera" ? "Camera" : "Screen")
                  : (audioMode === "mic" ? "Microphone" : "System audio")}
                {" · "}{minutesLeft} min left
              </p>

              <button
                onClick={stopRecording}
                className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all rounded-full flex items-center justify-center mx-auto border-2 border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500 active:scale-95 mt-4"
              >
                <div className="w-6 h-6 bg-zinc-800 dark:bg-white rounded-md" />
              </button>
              <p className="text-zinc-500 text-sm mt-3">Stop recording</p>
            </div>
          )}

          {/* ── PROCESSING ── */}
          {state === "processing" && (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-lg font-semibold mb-2">
                {recordType === "video" ? "Analyzing with Gemini AI..." : "Generating notes..."}
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Claude is reviewing your recording</p>
            </div>
          )}

          {/* ── DONE ── */}
          {state === "done" && (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold mb-2">Notes ready!</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Redirecting to your dashboard...</p>
            </div>
          )}

          {/* ── ERROR ── */}
          {state === "error" && (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
              <p className="text-red-400 text-sm mb-6">{error}</p>
              <button onClick={() => { setState("idle"); setError(""); }} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
