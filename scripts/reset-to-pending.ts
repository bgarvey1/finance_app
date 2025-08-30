#!/usr/bin/env tsx

/**
 * Reset Generated Content to Pending Review
 * 
 * This script resets all generated content to pending review status (is_approved = false)
 * so it can be reviewed through the admin interface.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { join } from "path";

config({ path: join(__dirname, "../.env") });
config({ path: join(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Supabase credentials are required");
  console.error("Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

if (SUPABASE_URL.includes("dummy") || SUPABASE_SERVICE_ROLE_KEY.includes("dummy")) {
  console.error("❌ Dummy Supabase credentials detected");
  console.error("Please update .env.local with real Supabase credentials to reset content status");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function resetContentToPending() {
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
    console.log("⚠️  No content found to reset");
    return;
  }

  const approved = allContent.filter(item => item.is_approved);
  console.log(`📝 ${approved.length} items are currently approved`);

  if (approved.length === 0) {
    console.log("✅ All content is already pending review!");
    return;
  }

  console.log("🔄 Resetting all content to pending review status...");
  
  const { error: updateError } = await supabase
    .from("pre_generated_panels")
    .update({ 
      is_approved: false,
      quality_score: null
    })
    .eq("is_approved", true);

  if (updateError) {
    console.error("❌ Failed to reset content:", updateError.message);
    process.exit(1);
  }

  console.log(`🎉 Successfully reset ${approved.length} content items to pending review!`);
  
  const { data: summary } = await supabase
    .from("pre_generated_panels")
    .select("lesson_slug, step_type")
    .eq("is_approved", false);

  if (summary) {
    const counts = summary.reduce((acc: any, item) => {
      const key = `${item.lesson_slug}-${item.step_type}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    
    console.log("\n📊 Pending review content summary:");
    console.table(counts);
  }
}

if (require.main === module) {
  resetContentToPending();
}

export { resetContentToPending };
