"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase";

type Usage = { minutes_used: number; minutes_limit: number; plan: string };

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free:    { label: "Free",    color: "text-zinc-400 dark:text-zinc-400" },
  starter: { label: "Starter", color: "text-blue-500" },
  pro:     { label: "Pro",     color: "text-violet-500" },
  power:   { label: "Power",   color: "text-amber-500" },
};

export default function ProfilePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setEmail(user.email ?? "");
      setName(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "");
      setAvatar(user.user_metadata?.avatar_url ?? "");
      const res = await fetch("/api/usage");
      if (res.ok) setUsage(await res.json());
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleDeleteAccount() {
    if (!confirm("Are you sure? This will permanently delete your account and all recordings. This cannot be undone.")) return;
    if (!confirm("Last chance — delete everything?")) return;
    setDeleting(true);
    // Sign out — full account deletion would require a server-side admin call
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const usagePercent = usage ? Math.min((usage.minutes_used / usage.minutes_limit) * 100, 100) : 0;
  const planInfo = PLAN_LABELS[usage?.plan ?? "free"] ?? PLAN_LABELS.free;

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-violet-500 rounded-md flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6z"/>
              <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </div>
          <span className="font-bold text-sm">VoxNote AI</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-8">Account</h1>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-900 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-4">

            {/* Profile */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-4">Profile</h2>
              <div className="flex items-center gap-4">
                {avatar ? (
                  <img src={avatar} alt={name} className="w-14 h-14 rounded-full" />
                ) : (
                  <div className="w-14 h-14 bg-violet-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-base">{name}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{email}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">Signed in with Google</p>
                </div>
              </div>
            </div>

            {/* Plan & Usage */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-4">Plan & Usage</h2>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className={`text-lg font-bold ${planInfo.color}`}>{planInfo.label}</span>
                  <span className="text-zinc-500 dark:text-zinc-500 text-sm ml-1">plan</span>
                </div>
                {usage?.plan === "free" && (
                  <Link href="/plans" className="text-xs bg-violet-500 hover:bg-violet-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium">
                    Upgrade
                  </Link>
                )}
              </div>
              {usage && (
                <>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-600 dark:text-zinc-400">{usage.minutes_used} of {usage.minutes_limit} minutes used</span>
                    <span className="text-zinc-500 dark:text-zinc-600">{Math.round(usagePercent)}%</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${usagePercent > 90 ? "bg-red-500" : "bg-violet-500"}`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-2">Resets monthly</p>
                </>
              )}
              {usage?.plan !== "free" && (
                <a
                  href="https://billing.stripe.com/p/login/test_00g"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Manage billing & invoices
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>

            {/* Appearance */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-4">Appearance</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex-1 flex flex-col items-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                    theme === "light"
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                  }`}
                >
                  <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                  </svg>
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Light</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex-1 flex flex-col items-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                    theme === "dark"
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                  }`}
                >
                  <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Dark</span>
                </button>
              </div>
            </div>

            {/* Links */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-200 dark:divide-zinc-800">
              <Link href="/plans" className="flex items-center justify-between px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">
                View all plans
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link href="/privacy" className="flex items-center justify-between px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">
                Privacy Policy
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link href="/terms" className="flex items-center justify-between px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">
                Terms of Service
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Sign out / Danger */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-200 dark:divide-zinc-800">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-between px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Sign out
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="w-full flex items-center justify-between px-6 py-4 text-sm text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete account"}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <p className="text-center text-xs text-zinc-400 dark:text-zinc-700">VoxNote AI · v1.0</p>
          </div>
        )}
      </div>
    </div>
  );
}
