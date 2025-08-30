#!/usr/bin/env tsx

/**
 * Approve Generated Content for Testing
 * 
 * This script approves all generated content so it can be used by the API.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { join } from "path";

config({ path: join(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Supabase credentials are required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function approveContent() {
  console.log("🔍 Checking generated content...");
  
  const { data: allContent, error: fetchError } = await supabase
    .from("pre_generated_panels")
    .select("id, lesson_slug, topic_id, step_type, is_approved")
    .order("lesson_slug")
    .order("topic_id")
    .order("step_type");

  if (fetchError) {
    console.error("❌ Failed to fetch content:", fetchError.message);
    process.exit(1);
  }

  console.log(`📊 Found ${allContent?.length || 0} generated content items`);
  
  if (!allContent || allContent.length === 0) {
    console.log("⚠️  No content found to approve");
    return;
  }

  const unapproved = allContent.filter(item => !item.is_approved);
  console.log(`📝 ${unapproved.length} items need approval`);

  if (unapproved.length === 0) {
    console.log("✅ All content is already approved!");
    return;
  }

  console.log("✅ Approving all generated content...");
  
  const { error: updateError } = await supabase
    .from("pre_generated_panels")
    .update({ 
      is_approved: true,
      quality_score: 0.8 
    })
    .eq("is_approved", false);

  if (updateError) {
    console.error("❌ Failed to approve content:", updateError.message);
    process.exit(1);
  }

  console.log(`🎉 Successfully approved ${unapproved.length} content items!`);
  
  const { data: summary } = await supabase
    .from("pre_generated_panels")
    .select("lesson_slug, step_type")
    .eq("is_approved", true);

  if (summary) {
    const counts = summary.reduce((acc: any, item) => {
      const key = `${item.lesson_slug}-${item.step_type}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    
    console.log("\n📊 Approved content summary:");
    console.table(counts);
  }
}

if (require.main === module) {
  approveContent();
}

export { approveContent };
