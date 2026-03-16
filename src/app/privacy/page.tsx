import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="flex items-center gap-2 mb-10 w-fit">
            <div className="w-6 h-6 bg-violet-500 rounded-md flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6z"/>
                <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </div>
            <span className="font-bold text-sm text-zinc-400 hover:text-white transition-colors">VoxNote AI</span>
          </Link>
          <h1 className="text-4xl font-bold mb-3">Privacy Policy</h1>
          <p className="text-zinc-500 text-sm">Last updated: March 16, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-10 text-zinc-300 text-sm leading-relaxed">

          <section>
            <p>
              VoxNote AI ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our service at voxnoteai.com.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">1. Information We Collect</h2>
            <p className="mb-3">We collect the following types of information:</p>
            <ul className="list-disc list-inside space-y-2 text-zinc-400 ml-2">
              <li><strong className="text-zinc-200">Account information</strong> — your name and email address when you sign up or sign in with Google.</li>
              <li><strong className="text-zinc-200">Audio and video recordings</strong> — files you record through our service, stored temporarily for processing and then deleted from our servers.</li>
              <li><strong className="text-zinc-200">Transcripts and notes</strong> — text content generated from your recordings, stored in your account.</li>
              <li><strong className="text-zinc-200">Chat messages</strong> — messages you send in AI chat sessions.</li>
              <li><strong className="text-zinc-200">Usage data</strong> — recording minutes used, plan type, and session timestamps.</li>
              <li><strong className="text-zinc-200">Payment information</strong> — handled entirely by Stripe. We never store your card details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="mb-3">We use your information to:</p>
            <ul className="list-disc list-inside space-y-2 text-zinc-400 ml-2">
              <li>Transcribe and summarize your recordings using AI</li>
              <li>Provide AI chat and Q&A features based on your content</li>
              <li>Track your usage against your plan's minute limit</li>
              <li>Process payments and manage your subscription</li>
              <li>Send important account and service notifications</li>
              <li>Improve and maintain our services</li>
            </ul>
            <p className="mt-3">We do <strong className="text-zinc-200">not</strong> sell your data to third parties or use your recordings to train AI models.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">3. Third-Party Services</h2>
            <p className="mb-3">We use the following third-party services to power VoxNote AI:</p>
            <ul className="list-disc list-inside space-y-2 text-zinc-400 ml-2">
              <li><strong className="text-zinc-200">Anthropic (Claude)</strong> — AI summarization, note generation, and chat responses</li>
              <li><strong className="text-zinc-200">OpenAI (Whisper)</strong> — audio transcription</li>
              <li><strong className="text-zinc-200">Google (Gemini)</strong> — video analysis on paid plans</li>
              <li><strong className="text-zinc-200">Supabase</strong> — secure database and authentication</li>
              <li><strong className="text-zinc-200">Stripe</strong> — payment processing</li>
              <li><strong className="text-zinc-200">Google OAuth</strong> — sign-in authentication</li>
            </ul>
            <p className="mt-3">Each of these services has its own privacy policy governing how they handle data sent to them for processing.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">4. Data Storage and Security</h2>
            <p className="mb-3">
              Your data is stored securely using Supabase infrastructure with row-level security. Audio and video files are processed in memory and are not retained on our servers after transcription is complete. Transcripts, notes, and chat messages are stored in your account and accessible only to you.
            </p>
            <p>
              We use industry-standard encryption for data in transit (HTTPS/TLS) and at rest. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">5. Data Retention</h2>
            <p>
              We retain your recordings, transcripts, and chat history for as long as your account is active. You can delete individual recordings and chat sessions at any time from your dashboard. If you delete your account, all associated data is permanently removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">6. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-zinc-400 ml-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data and account</li>
              <li>Export your transcripts and notes</li>
              <li>Opt out of non-essential communications</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at <span className="text-violet-400">support@voxnoteai.com</span>.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">7. Children's Privacy</h2>
            <p>
              VoxNote AI is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us and we will promptly delete it.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by displaying a notice in the app. Continued use of VoxNote AI after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">9. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or how we handle your data, reach out to us at <span className="text-violet-400">support@voxnoteai.com</span>.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-600">
          <span>© 2026 VoxNote AI</span>
          <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
