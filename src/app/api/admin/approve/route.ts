import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Supabase credentials are required for admin API");
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

    console.log(`🔄 API: Updating content id=${id} with approve=${approve}`);
    
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
      console.error("❌ API: Error updating content approval:", error);
      return NextResponse.json(
        { error: "Failed to update content" },
        { status: 500 }
      );
    }

    console.log(`✅ API: Successfully updated content:`, { 
      id: data.id, 
      is_approved: data.is_approved, 
      quality_score: data.quality_score 
    });

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
    console.log(`📥 API: Fetching all content from database`);
    
    const { data, error } = await supabase
      .from("pre_generated_panels")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ API: Error fetching content:", error);
      return NextResponse.json(
        { error: "Failed to fetch content" },
        { status: 500 }
      );
    }

    const approvedCount = data?.filter(item => item.is_approved).length || 0;
    const pendingCount = data?.filter(item => !item.is_approved).length || 0;
    
    console.log(`✅ API: Fetched ${data?.length || 0} items (${approvedCount} approved, ${pendingCount} pending)`);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("❌ API: Error in approve API GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
