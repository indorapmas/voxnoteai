import Link from "next/link";

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold mb-3">Terms of Service</h1>
          <p className="text-zinc-500 text-sm">Last updated: March 16, 2026</p>
        </div>

        <div className="space-y-10 text-zinc-300 text-sm leading-relaxed">

          <section>
            <p>
              Welcome to VoxNote AI. By accessing or using our service, you agree to be bound by these Terms of Service. Please read them carefully. If you do not agree, do not use VoxNote AI.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
            <p>
              These Terms of Service ("Terms") govern your use of VoxNote AI, operated by VoxNote AI ("Company", "we", "us", or "our"). By creating an account or using any part of our service, you confirm that you are at least 13 years old and legally capable of entering into a binding agreement.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">2. Description of Service</h2>
            <p className="mb-3">
              VoxNote AI is an AI-powered note-taking service that allows users to record audio and video, receive AI-generated transcripts and summaries, and interact with AI chat features. Features available depend on your subscription plan.
            </p>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of the service at any time with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">3. Accounts</h2>
            <p className="mb-3">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
            <p>
              We reserve the right to terminate accounts that violate these Terms, engage in abusive behavior, or are used for illegal activities.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">4. Subscriptions and Billing</h2>
            <p className="mb-3">
              VoxNote AI offers both free and paid subscription plans. Paid plans are billed on a monthly basis through Stripe. By subscribing, you authorize us to charge your payment method on a recurring basis until you cancel.
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-400 ml-2 mb-3">
              <li>You may cancel your subscription at any time from your account settings.</li>
              <li>Cancellations take effect at the end of the current billing period.</li>
              <li>We do not offer refunds for partial months of service.</li>
              <li>We reserve the right to change pricing with 30 days' notice.</li>
            </ul>
            <p>
              Minutes are allocated monthly and do not roll over to the next billing period.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">5. Acceptable Use</h2>
            <p className="mb-3">You agree not to use VoxNote AI to:</p>
            <ul className="list-disc list-inside space-y-2 text-zinc-400 ml-2">
              <li>Record conversations without the consent of all parties involved, where required by law</li>
              <li>Process, store, or transmit content that is illegal, harmful, threatening, or harassing</li>
              <li>Upload material that infringes on intellectual property rights</li>
              <li>Attempt to reverse-engineer, hack, or disrupt the service</li>
              <li>Use automated scripts or bots to abuse the platform</li>
              <li>Resell or redistribute access to the service without authorization</li>
              <li>Generate or distribute misinformation, spam, or malicious content</li>
            </ul>
            <p className="mt-3">
              <strong className="text-zinc-200">Recording consent:</strong> It is your sole responsibility to comply with all applicable laws regarding recording conversations, including obtaining consent from other parties where required. VoxNote AI is not liable for your failure to comply with recording laws in your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">6. Your Content</h2>
            <p className="mb-3">
              You retain full ownership of all content you record, upload, or create through VoxNote AI. By using our service, you grant us a limited, non-exclusive license to process your content solely for the purpose of providing the service to you.
            </p>
            <p>
              We do not claim ownership of your recordings, transcripts, or notes. We do not use your content to train AI models or share it with third parties except as necessary to provide the service (e.g., sending audio to Whisper for transcription).
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">7. AI-Generated Content</h2>
            <p className="mb-3">
              Summaries, notes, and AI responses generated by VoxNote AI are produced automatically and may not always be accurate, complete, or free from errors. You should not rely on AI-generated content for legal, medical, financial, or other professional advice.
            </p>
            <p>
              We are not responsible for decisions made based on AI-generated content. Always verify important information independently.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">8. Intellectual Property</h2>
            <p>
              VoxNote AI, its logo, design, software, and all related intellectual property are owned by us or our licensors. Nothing in these Terms grants you a right to use our trademarks, logos, or proprietary technology except as permitted to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">9. Limitation of Liability</h2>
            <p className="mb-3">
              To the fullest extent permitted by law, VoxNote AI and its affiliates, officers, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of data, loss of profits, or business interruption.
            </p>
            <p>
              Our total liability to you for any claim arising from the use of the service shall not exceed the amount you paid us in the 3 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">10. Disclaimer of Warranties</h2>
            <p>
              VoxNote AI is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee that the service will be uninterrupted, error-free, or completely secure.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">11. Termination</h2>
            <p>
              You may stop using the service and close your account at any time. We may suspend or terminate your account if you violate these Terms. Upon termination, your right to use the service ceases immediately, and we may delete your data in accordance with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">12. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with applicable laws. Any disputes shall be resolved through binding arbitration rather than in court, except where prohibited by law.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">13. Changes to Terms</h2>
            <p>
              We may update these Terms at any time. We will notify you of material changes via email or in-app notice at least 14 days before they take effect. Continued use of the service after the effective date constitutes your acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">14. Contact</h2>
            <p>
              For questions about these Terms, contact us at <span className="text-violet-400">support@voxnoteai.com</span>.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-600">
          <span>© 2026 VoxNote AI</span>
          <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
