import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { config } from "dotenv";
import { join } from "path";

config({ path: join(process.cwd(), ".env") });
config({ path: join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

console.log("🔍 API Route Environment Check:", {
  hasSupabaseUrl: !!SUPABASE_URL,
  hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
  urlPrefix: SUPABASE_URL ? SUPABASE_URL.substring(0, 20) + "..." : "missing",
  keyPrefix: SUPABASE_SERVICE_ROLE_KEY ? SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + "..." : "missing",
  isDummy: SUPABASE_URL.includes("dummy") || SUPABASE_SERVICE_ROLE_KEY.includes("dummy")
});

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || SUPABASE_URL.includes("dummy") || SUPABASE_SERVICE_ROLE_KEY.includes("dummy")) {
  console.error("❌ Real Supabase credentials are required for admin API");
  console.error("Please ensure .env file contains valid SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: NextRequest) {
  try {
    const { id, approve } = await request.json();

    if (typeof id !== "number" || typeof approve !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("pre_generated_panels")
      .update({
        is_approved: approve,
        quality_score: approve ? 0.8 : 0.2,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating content approval:", error);
      return NextResponse.json(
        { error: "Failed to update content" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in approve API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("pre_generated_panels")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching content:", error);
      return NextResponse.json(
        { error: "Failed to fetch content" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error in approve API GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
