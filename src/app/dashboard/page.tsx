"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import ReactMarkdown from "react-markdown";

type Recording = {
  id: string;
  title: string;
  duration_minutes: number;
  summary: string;
  action_items: string;
  transcript: string;
  folder_id: string | null;
  created_at: string;
};

type Folder = {
  id: string;
  name: string;
};

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
};

type Usage = {
  minutes_used: number;
  minutes_limit: number;
  plan: string;
};

type ChatSession = {
  id: string;
  title: string;
  folder_id: string | null;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [selected, setSelected] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null); // null = All

  // Rename recording state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Rename chat state
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatTitle, setEditingChatTitle] = useState("");

  // Folder creation
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Folder rename
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "chat">("notes");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserEmail(user.email ?? "");
      await refresh();
    }
    load();
  }, [router]);

  async function refresh() {
    const [recRes, usageRes, foldersRes, chatsRes] = await Promise.all([
      fetch("/api/recordings"),
      fetch("/api/usage"),
      fetch("/api/folders"),
      fetch("/api/chat/sessions"),
    ]);
    if (recRes.ok) setRecordings(await recRes.json());
    if (usageRes.ok) setUsage(await usageRes.json());
    if (foldersRes.ok) setFolders(await foldersRes.json());
    if (chatsRes.ok) setChatSessions(await chatsRes.json());
    setLoading(false);
  }

  async function startNewChat() {
    const res = await fetch("/api/chat/sessions", { method: "POST" });
    if (res.ok) {
      const session = await res.json();
      router.push(`/chat/${session.id}`);
    }
  }

  async function selectRecording(r: Recording) {
    setSelected(r);
    setActiveTab("notes");
    setMessages([]);
    // Load chat history
    const res = await fetch(`/api/recordings/${r.id}/chat`);
    if (res.ok) setMessages(await res.json());
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  // Rename recording
  async function saveRename(id: string) {
    if (!editingTitle.trim()) return;
    await fetch(`/api/recordings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editingTitle.trim() }),
    });
    setRecordings((prev) => prev.map((r) => r.id === id ? { ...r, title: editingTitle.trim() } : r));
    if (selected?.id === id) setSelected((s) => s ? { ...s, title: editingTitle.trim() } : s);
    setEditingId(null);
  }

  // Delete recording
  async function deleteRecording(id: string) {
    if (!confirm("Delete this recording?")) return;
    await fetch(`/api/recordings/${id}`, { method: "DELETE" });
    setRecordings((prev) => prev.filter((r) => r.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  // Assign folder to recording
  async function assignFolder(recordingId: string, folderId: string | null) {
    await fetch(`/api/recordings/${recordingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder_id: folderId }),
    });
    setRecordings((prev) => prev.map((r) => r.id === recordingId ? { ...r, folder_id: folderId } : r));
  }

  // Rename chat
  async function saveRenameChat(id: string) {
    if (!editingChatTitle.trim()) return;
    await fetch(`/api/chat/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editingChatTitle.trim() }),
    });
    setChatSessions((prev) => prev.map((s) => s.id === id ? { ...s, title: editingChatTitle.trim() } : s));
    setEditingChatId(null);
  }

  // Delete chat
  async function deleteChat(id: string) {
    if (!confirm("Delete this chat?")) return;
    await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
    setChatSessions((prev) => prev.filter((s) => s.id !== id));
  }

  // Assign folder to chat
  async function assignChatFolder(chatId: string, folderId: string | null) {
    await fetch(`/api/chat/sessions/${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder_id: folderId }),
    });
    setChatSessions((prev) => prev.map((s) => s.id === chatId ? { ...s, folder_id: folderId } : s));
  }

  // Create folder
  async function createFolder() {
    if (!newFolderName.trim()) return;
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName.trim() }),
    });
    if (res.ok) {
      const folder = await res.json();
      setFolders((prev) => [...prev, folder]);
    }
    setNewFolderName("");
    setCreatingFolder(false);
  }

  // Delete folder
  async function deleteFolder(id: string) {
    if (!confirm("Delete this folder? Items inside will be kept.")) return;
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setRecordings((prev) => prev.map((r) => r.folder_id === id ? { ...r, folder_id: null } : r));
    setChatSessions((prev) => prev.map((s) => s.folder_id === id ? { ...s, folder_id: null } : s));
    if (activeFolder === id) setActiveFolder(null);
  }

  // Rename folder
  async function saveRenameFolder(id: string) {
    if (!editingFolderName.trim()) return;
    await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingFolderName.trim() }),
    });
    setFolders((prev) => prev.map((f) => f.id === id ? { ...f, name: editingFolderName.trim() } : f));
    setEditingFolderId(null);
  }

  // Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendChat() {
    if (!chatInput.trim() || !selected || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);

    // Add placeholder assistant message
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const res = await fetch(`/api/recordings/${selected.id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMsg }),
    });

    if (!res.body) { setChatLoading(false); return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") break;
        try {
          const { text } = JSON.parse(data);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: updated[updated.length - 1].content + text,
            };
            return updated;
          });
        } catch {}
      }
    }
    setChatLoading(false);
  }

  const usagePercent = usage ? Math.min((usage.minutes_used / usage.minutes_limit) * 100, 100) : 0;
  const filteredRecordings = activeFolder === null
    ? recordings
    : recordings.filter((r) => r.folder_id === activeFolder);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-500 rounded-md flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6z"/>
                <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </div>
            <span className="font-bold text-sm">VoxNote AI</span>
          </Link>
        </div>

        <div className="p-3 space-y-2">
          <Link
            href="/record"
            className="flex items-center justify-center gap-2 w-full bg-violet-500 hover:bg-violet-600 transition-colors text-white text-xs font-medium px-3 py-2 rounded-lg"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Recording
          </Link>
          <Link
            href="/live"
            className="flex items-center justify-center gap-2 w-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-700 dark:text-white text-xs font-medium px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
          >
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
            Live Recording
          </Link>
          <button
            onClick={startNewChat}
            className="flex items-center justify-center gap-2 w-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-700 dark:text-white text-xs font-medium px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            New Chat
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          {/* All Recordings */}
          <button
            onClick={() => setActiveFolder(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${activeFolder === null ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50"}`}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="flex-1 text-left">All Recordings</span>
            <span className="text-zinc-400 dark:text-zinc-600">{recordings.length}</span>
          </button>

          {/* Recent Chats */}
          {chatSessions.length > 0 && (
            <div className="mt-3 mb-1">
              <div className="flex items-center justify-between px-3 mb-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-600 uppercase tracking-wider font-medium">Chats</span>
              </div>
              {chatSessions.slice(0, 8).map((session) => (
                <div key={session.id} className="group relative">
                  {editingChatId === session.id ? (
                    <div className="px-2 mb-0.5">
                      <input
                        autoFocus
                        value={editingChatTitle}
                        onChange={(e) => setEditingChatTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveRenameChat(session.id); if (e.key === "Escape") setEditingChatId(null); }}
                        onBlur={() => saveRenameChat(session.id)}
                        className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  ) : (
                    <Link
                      href={`/chat/${session.id}`}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors pr-16"
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="truncate">{session.title}</span>
                    </Link>
                  )}
                  <div className="absolute right-1 top-1 hidden group-hover:flex items-center gap-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded shadow-sm">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingChatId(session.id); setEditingChatTitle(session.title); }}
                      className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
                      title="Rename"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <div className="relative group/chatfolder">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
                        title="Move to folder"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                        </svg>
                      </button>
                      <div className="absolute right-0 top-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 w-40 py-1 hidden group-hover/chatfolder:block">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); assignChatFolder(session.id, null); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                          No folder
                        </button>
                        {folders.map((f) => (
                          <button
                            key={f.id}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); assignChatFolder(session.id, f.id); }}
                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors ${session.folder_id === f.id ? "text-violet-500 dark:text-violet-400" : "text-zinc-600 dark:text-zinc-300"}`}
                          >
                            {f.name}
                          </button>
                        ))}
                        {folders.length === 0 && (
                          <p className="px-3 py-1.5 text-xs text-zinc-400 dark:text-zinc-500">No folders yet</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteChat(session.id); }}
                      className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-red-400 rounded"
                      title="Delete"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Folders */}
          <div className="mt-3 mb-1">
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-600 uppercase tracking-wider font-medium">Folders</span>
              <button
                onClick={() => setCreatingFolder(true)}
                className="text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                title="New folder"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {creatingFolder && (
              <div className="px-2 mb-1">
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setCreatingFolder(false); }}
                  onBlur={createFolder}
                  placeholder="Folder name"
                  className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
              </div>
            )}

            {folders.map((folder) => (
              <div key={folder.id} className="group relative">
                {editingFolderId === folder.id ? (
                  <div className="px-2 mb-0.5">
                    <input
                      autoFocus
                      value={editingFolderName}
                      onChange={(e) => setEditingFolderName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveRenameFolder(folder.id); if (e.key === "Escape") setEditingFolderId(null); }}
                      onBlur={() => saveRenameFolder(folder.id)}
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveFolder(folder.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${activeFolder === folder.id ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50"}`}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                    </svg>
                    <span className="flex-1 text-left truncate">{folder.name}</span>
                    <span className="text-zinc-400 dark:text-zinc-600">{recordings.filter((r) => r.folder_id === folder.id).length + chatSessions.filter((s) => s.folder_id === folder.id).length}</span>
                  </button>
                )}
                <div className="absolute right-1 top-1 hidden group-hover:flex items-center gap-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded shadow-sm">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); setEditingFolderName(folder.name); }}
                    className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                    className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-red-400 rounded"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Usage */}
        {usage && (
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
              <span>{usage.minutes_used} / {usage.minutes_limit} min</span>
              <span className="capitalize text-violet-500 dark:text-violet-400">{usage.plan}</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1">
              <div className="bg-violet-500 h-1 rounded-full transition-all" style={{ width: `${usagePercent}%` }}></div>
            </div>
            {usage.plan === "free" && (
              <Link href="/plans" className="mt-2 w-full text-xs bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-400 py-1.5 rounded-lg transition-colors block text-center">
                Upgrade plan
              </Link>
            )}
          </div>
        )}

        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Link href="/profile" className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity">
              <div className="w-6 h-6 bg-zinc-300 dark:bg-zinc-700 rounded-full flex items-center justify-center text-xs font-medium text-zinc-700 dark:text-white flex-shrink-0">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate flex-1">{userEmail}</p>
            </Link>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors flex-shrink-0"
              title="Toggle theme"
            >
              {theme === "dark" ? (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button onClick={handleSignOut} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Recordings list */}
      <div className="w-72 border-r border-zinc-200 dark:border-zinc-800 flex flex-col flex-shrink-0 bg-zinc-50/80 dark:bg-zinc-950/50">
        <div className="px-4 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {activeFolder === null ? "All Recordings" : folders.find((f) => f.id === activeFolder)?.name ?? "Folder"}
          </h2>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">{filteredRecordings.length + (activeFolder ? chatSessions.filter((s) => s.folder_id === activeFolder).length : 0)}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-zinc-100 dark:bg-zinc-900 rounded-xl p-4 animate-pulse">
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3 mb-2"></div>
                  <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : filteredRecordings.length === 0 ? (
            <div className="text-center py-16 px-4">
              <p className="text-zinc-500 text-sm mb-1">No recordings yet</p>
              <Link href="/record" className="text-violet-500 dark:text-violet-400 text-xs hover:text-violet-600 dark:hover:text-violet-300">Start recording →</Link>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredRecordings.map((r) => (
                <div
                  key={r.id}
                  className={`group relative rounded-xl p-3.5 cursor-pointer transition-colors ${selected?.id === r.id ? "bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700" : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border border-transparent"}`}
                  onClick={() => selectRecording(r)}
                >
                  {editingId === r.id ? (
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveRename(r.id); if (e.key === "Escape") setEditingId(null); }}
                      onBlur={() => saveRename(r.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded px-2 py-1 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 mb-1"
                    />
                  ) : (
                    <p className="text-xs font-medium mb-1 pr-8 leading-snug">{r.title}</p>
                  )}
                  <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{r.summary}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-zinc-500 dark:text-zinc-600">{r.duration_minutes} min</span>
                    <span className="text-zinc-300 dark:text-zinc-700">·</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-600">
                      {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="absolute top-2.5 right-2.5 hidden group-hover:flex items-center gap-0.5 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 shadow-sm">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(r.id); setEditingTitle(r.title); }}
                      className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded transition-colors"
                      title="Rename"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <div className="relative group/folder">
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded transition-colors"
                        title="Move to folder"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                        </svg>
                      </button>
                      <div className="absolute right-0 top-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 w-40 py-1 hidden group-hover/folder:block">
                        <button
                          onClick={(e) => { e.stopPropagation(); assignFolder(r.id, null); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                          No folder
                        </button>
                        {folders.map((f) => (
                          <button
                            key={f.id}
                            onClick={(e) => { e.stopPropagation(); assignFolder(r.id, f.id); }}
                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors ${r.folder_id === f.id ? "text-violet-500 dark:text-violet-400" : "text-zinc-600 dark:text-zinc-300"}`}
                          >
                            {f.name}
                          </button>
                        ))}
                        {folders.length === 0 && (
                          <p className="px-3 py-1.5 text-xs text-zinc-400 dark:text-zinc-500">No folders yet</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteRecording(r.id); }}
                      className="p-1 text-zinc-400 hover:text-red-500 rounded transition-colors"
                      title="Delete"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-black">
        {!selected ? (
          <div className="flex-1 overflow-y-auto p-8">
            {/* Welcome */}
            <div className="mb-10">
              <h1 className="text-2xl font-bold mb-1">
                {userEmail ? `Hey, ${userEmail.split("@")[0]} 👋` : "Welcome back"}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-500 text-sm">What would you like to do today?</p>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-4 mb-12 max-w-xl">
              <Link
                href="/record"
                className="group bg-violet-500 hover:bg-violet-600 transition-all rounded-2xl p-6 flex flex-col gap-3"
              >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">New Audio Recording</p>
                  <p className="text-violet-200 text-xs mt-0.5">Mic or system audio</p>
                </div>
              </Link>

              <Link
                href="/record"
                className="group bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all rounded-2xl p-6 flex flex-col gap-3"
              >
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm text-zinc-900 dark:text-white">New Video Recording</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {usage?.plan === "free" ? (
                      <span className="text-yellow-500">Pro+ required</span>
                    ) : "Camera or screen"}
                  </p>
                </div>
              </Link>

              <Link
                href="/live"
                className="group bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all rounded-2xl p-6 flex flex-col gap-3"
              >
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full group-hover:animate-pulse" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-zinc-900 dark:text-white">Live Recording</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Real-time transcript as you speak</p>
                </div>
              </Link>

              <button
                onClick={startNewChat}
                className="group bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all rounded-2xl p-6 flex flex-col gap-3 text-left"
              >
                <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm text-zinc-900 dark:text-white">Start Chat</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Ask AI, attach photos & videos</p>
                </div>
              </button>

              <Link
                href="/plans"
                className="group bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all rounded-2xl p-6 flex flex-col gap-3"
              >
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm text-zinc-900 dark:text-white">Upgrade Plan</p>
                  <p className="text-zinc-500 text-xs mt-0.5">More minutes + video</p>
                </div>
              </Link>

              <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col gap-3">
                <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm text-zinc-900 dark:text-white">Usage</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {usage ? `${usage.minutes_used} / ${usage.minutes_limit} min used` : "Loading..."}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent sessions */}
            {recordings.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">Recent Sessions</h2>
                <div className="space-y-2 max-w-xl">
                  {recordings.slice(0, 5).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => selectRecording(r)}
                      className="w-full text-left bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl p-4 transition-colors flex items-center gap-4"
                    >
                      <div className="w-9 h-9 bg-zinc-200 dark:bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">{r.summary}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-zinc-500 dark:text-zinc-500">{r.duration_minutes} min</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">
                          {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
              <div className="flex-1 min-w-0 mr-4">
                <h1 className="text-base font-bold truncate">{selected.title}</h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
                  {new Date(selected.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · {selected.duration_minutes} min
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => navigator.clipboard.writeText(`${selected.summary}\n\nAction Items:\n${selected.action_items}`)}
                  className="text-xs border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Copy notes
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
              <button
                onClick={() => setActiveTab("notes")}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "notes" ? "border-violet-500 text-zinc-900 dark:text-white" : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
              >
                Notes
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === "chat" ? "border-violet-500 text-zinc-900 dark:text-white" : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
              >
                Ask AI
                {messages.length > 0 && (
                  <span className="bg-violet-500/20 text-violet-400 text-xs px-1.5 py-0.5 rounded-full">{messages.length}</span>
                )}
              </button>
            </div>

            {/* Tab content */}
            {activeTab === "notes" ? (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl space-y-5">
                  <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                    <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wider">Summary</h2>
                    <p className="text-zinc-700 dark:text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">{selected.summary}</p>
                  </div>
                  {selected.action_items && (
                    <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wider">Action Items</h2>
                      <div className="space-y-2">
                        {selected.action_items.split("\n").filter(Boolean).map((item, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-200">
                            <div className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-1.5 flex-shrink-0"></div>
                            {item.replace(/^[-•*]\s*/, "")}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <p className="text-zinc-400 text-sm font-medium mb-1">Ask anything about this recording</p>
                      <p className="text-zinc-600 text-xs">e.g. "What were the main decisions?" or "Who is responsible for X?"</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-lg rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-violet-500 text-white rounded-br-sm"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-bl-sm"
                      }`}>
                        {msg.content ? (
                          msg.role === "assistant" ? (
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                                li: ({ children }) => <li className="text-sm">{children}</li>,
                                strong: ({ children }) => <strong className="font-semibold text-zinc-900 dark:text-white">{children}</strong>,
                                h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-sm font-bold mb-2">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                                code: ({ children }) => <code className="bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          ) : (
                            msg.content
                          )
                        ) : (
                          <span className="flex gap-1 items-center h-4">
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat input */}
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                  <div className="flex gap-2 items-end">
                    <textarea
                      ref={chatInputRef}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                      placeholder="Ask about this recording..."
                      rows={1}
                      className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none"
                      style={{ minHeight: "44px", maxHeight: "120px" }}
                    />
                    <button
                      onClick={sendChat}
                      disabled={!chatInput.trim() || chatLoading}
                      className="bg-violet-500 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-2 text-center">Enter to send · Shift+Enter for new line</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
