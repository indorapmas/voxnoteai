import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("users_usage")
    .select("minutes_used, minutes_limit, plan")
    .eq("user_id", user.id)
    .single();

  if (!data) {
    await admin.from("users_usage").insert({ user_id: user.id });
    return NextResponse.json({ minutes_used: 0, minutes_limit: 10, plan: "free" });
  }

  return NextResponse.json(data);
}
