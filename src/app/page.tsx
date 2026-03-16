import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6z"/>
              <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </div>
          <span className="font-bold text-lg">VoxNote AI</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className="text-sm bg-violet-500 hover:bg-violet-600 transition-colors px-4 py-2 rounded-lg font-medium">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 pt-20 pb-24 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse"></span>
          AI-powered meeting notes
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
          Record anything.<br />
          <span className="text-violet-400">Know everything.</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Hit record on any call or meeting. VoxNote AI transcribes every word and delivers clean notes, action items, and summaries — instantly.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="w-full sm:w-auto bg-violet-500 hover:bg-violet-600 transition-colors text-white font-semibold px-8 py-3.5 rounded-xl text-base"
          >
            Start for free
          </Link>
          <Link
            href="#pricing"
            className="w-full sm:w-auto border border-zinc-700 hover:border-zinc-500 transition-colors text-zinc-300 font-medium px-8 py-3.5 rounded-xl text-base"
          >
            See pricing
          </Link>
        </div>
        <p className="text-xs text-zinc-600 mt-4">10 free minutes to try. No credit card required.</p>
      </section>

      {/* App Preview */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-950">
            <div className="w-3 h-3 rounded-full bg-red-500/70"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/70"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/70"></div>
            <span className="text-zinc-500 text-xs ml-3">app.voxnoteai.com</span>
          </div>
          <div className="p-8 grid md:grid-cols-2 gap-6">
            <div className="bg-zinc-950 rounded-xl p-5 border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-zinc-300">Q2 Sales Standup</span>
                <span className="text-xs text-zinc-600">24 min</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-zinc-800 rounded w-full"></div>
                <div className="h-2 bg-zinc-800 rounded w-4/5"></div>
                <div className="h-2 bg-zinc-800 rounded w-3/5"></div>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wide">Action Items</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full flex-shrink-0"></div>
                    Follow up with leads by Friday
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full flex-shrink-0"></div>
                    Update CRM with Q2 pipeline
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-zinc-950 rounded-xl p-5 border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-zinc-300">Client Onboarding Call</span>
                <span className="text-xs text-emerald-500 font-medium">Recording...</span>
              </div>
              <div className="flex items-center justify-center h-24">
                <div className="flex items-end gap-1">
                  {[3, 6, 4, 8, 5, 7, 3, 6, 9, 4, 7, 5, 8, 3, 6].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-violet-500 rounded-full opacity-70"
                      style={{ height: `${h * 4}px` }}
                    ></div>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-center">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors">
                  <div className="w-3.5 h-3.5 bg-white rounded-sm"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-3">Everything you need</h2>
        <p className="text-zinc-400 text-center mb-14">No bots. No integrations. Just open a tab and record.</p>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            {
              icon: "🎙️",
              title: "One-click recording",
              desc: "Record your microphone or capture system audio from anything — meetings, lectures, podcasts, calls, or any audio playing on your device."
            },
            {
              icon: "📹",
              title: "Video recording",
              desc: "Record from your camera or capture your entire screen with audio. Perfect for tutorials, demos, and video calls."
            },
            {
              icon: "🔴",
              title: "Live recording",
              desc: "Real-time transcription as you speak. Watch your words appear on screen the moment you say them."
            },
            {
              icon: "⚡",
              title: "Instant transcription",
              desc: "Powered by OpenAI Whisper. Accurate transcripts in seconds, not minutes."
            },
            {
              icon: "🧠",
              title: "AI summaries",
              desc: "Get a clean summary, key decisions, and action items pulled from every recording automatically."
            },
            {
              icon: "🔍",
              title: "Search everything",
              desc: "Full-text search across all your recordings. Find any moment from any meeting instantly."
            },
            {
              icon: "📤",
              title: "Export anywhere",
              desc: "Copy notes to clipboard or download as a text file. Your notes, your way."
            },
            {
              icon: "🔒",
              title: "Private by default",
              desc: "Your recordings are encrypted and only accessible to you. We never train on your data."
            }
          ].map((f) => (
            <div key={f.title} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-3">Simple pricing</h2>
        <p className="text-zinc-400 text-center mb-14">Pay for minutes used. No per-seat nonsense.</p>
        <div className="grid md:grid-cols-4 gap-5">
          {[
            { name: "Free", price: 0, minutes: 10, features: ["10 min/month", "AI summaries", "7-day history"] },
            { name: "Starter", price: 12, minutes: 600, features: ["600 min/month", "AI summaries", "Unlimited history", "PDF export"], priceId: "starter" },
            { name: "Pro", price: 25, minutes: 1800, features: ["1,800 min/month", "AI summaries", "Unlimited history", "PDF + Notion export", "Priority processing"], priceId: "pro", popular: true },
            { name: "Power", price: 59, minutes: 6000, features: ["6,000 min/month", "Everything in Pro", "5 team members", "Admin dashboard"], priceId: "power" },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl p-6 border ${plan.popular ? "bg-violet-500/10 border-violet-500/50" : "bg-zinc-900 border-zinc-800"}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most popular
                </div>
              )}
              <div className="mb-4">
                <p className="text-sm text-zinc-400 mb-1">{plan.name}</p>
                <p className="text-3xl font-bold">${plan.price}<span className="text-sm font-normal text-zinc-500">/mo</span></p>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                    <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`block text-center text-sm font-medium py-2.5 rounded-lg transition-colors ${plan.popular ? "bg-violet-500 hover:bg-violet-600 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"}`}
              >
                {plan.price === 0 ? "Start free" : "Get started"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <div className="bg-gradient-to-br from-violet-900/40 to-zinc-900 border border-violet-500/20 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Never miss a detail again</h2>
          <p className="text-zinc-400 mb-8">Join people who use VoxNote AI to stay on top of every conversation.</p>
          <Link
            href="/signup"
            className="inline-block bg-violet-500 hover:bg-violet-600 transition-colors text-white font-semibold px-8 py-3.5 rounded-xl"
          >
            Start for free — 10 min included
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-8 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-violet-500 rounded-md flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6z"/>
              <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </div>
          <span className="text-sm font-medium">VoxNote AI</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Terms of Service</Link>
          <p className="text-xs text-zinc-600">© 2026 VoxNote AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
