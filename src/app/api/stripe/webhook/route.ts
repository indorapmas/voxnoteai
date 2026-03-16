import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-server";
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan as keyof typeof PLANS;

    if (userId && plan && PLANS[plan]) {
      await admin.from("users_usage").upsert({
        user_id: userId,
        minutes_limit: PLANS[plan].minutes,
        plan,
      }, { onConflict: "user_id" });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const customer = await stripe.customers.retrieve(subscription.customer as string) as { email?: string };
    if (customer.email) {
      const admin2 = createAdminClient();
      const { data: users } = await admin2.auth.admin.listUsers();
      const user = users?.users?.find((u: { email?: string }) => u.email === customer.email);
      if (user) {
        await admin2.from("users_usage").update({ minutes_limit: 10, plan: "free" }).eq("user_id", user.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
