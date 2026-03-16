"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    minutes: 10,
    features: ["10 min/month", "AI summaries", "7-day history"],
    cta: "Current plan",
    disabled: true,
  },
  {
    id: "starter",
    name: "Starter",
    price: 12,
    minutes: 120,
    features: ["120 min/month", "AI summaries", "Unlimited history", "PDF export"],
    cta: "Upgrade to Starter",
  },
  {
    id: "pro",
    name: "Pro",
    price: 25,
    minutes: 300,
    features: ["300 min/month", "AI summaries", "Unlimited history", "PDF + Notion export", "Priority processing"],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    id: "power",
    name: "Power",
    price: 59,
    minutes: 900,
    features: ["900 min/month", "Everything in Pro", "5 team members", "Admin dashboard"],
    cta: "Upgrade to Power",
  },
];

export default function PlansPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleUpgrade(planId: string) {
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const { url, error } = await res.json();
      if (error) {
        alert(error);
        setLoading(null);
        return;
      }
      if (url) window.location.href = url;
    } catch {
      alert("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-12">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-violet-500 rounded-md flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6z"/>
                <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </div>
            <span className="font-bold text-sm">VoxNote AI</span>
          </Link>
        </div>

        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold mb-3">Choose your plan</h1>
          <p className="text-zinc-400">Pay for what you use. Cancel anytime.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 border flex flex-col ${
                plan.popular
                  ? "bg-violet-500/10 border-violet-500/50"
                  : "bg-zinc-900 border-zinc-800"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500 text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                  Most popular
                </div>
              )}

              <div className="mb-5">
                <p className="text-sm text-zinc-400 mb-1">{plan.name}</p>
                <p className="text-4xl font-bold">
                  ${plan.price}
                  <span className="text-sm font-normal text-zinc-500">/mo</span>
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {plan.minutes.toLocaleString()} min/month
                </p>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                    <svg
                      className="w-4 h-4 text-violet-400 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => !plan.disabled && handleUpgrade(plan.id)}
                disabled={!!plan.disabled || loading === plan.id}
                className={`w-full text-sm font-medium py-3 rounded-xl transition-colors ${
                  plan.disabled
                    ? "bg-zinc-800 text-zinc-500 cursor-default"
                    : plan.popular
                    ? "bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-60"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-60"
                }`}
              >
                {loading === plan.id ? "Redirecting..." : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-zinc-600 mt-10">
          Secure payments powered by Stripe · Cancel anytime from your account
        </p>
      </div>
    </div>
  );
}
