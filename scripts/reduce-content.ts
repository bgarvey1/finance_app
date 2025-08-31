#!/usr/bin/env tsx

/**
 * Content Reduction Script
 * 
 * Randomly reduces content variations to 2-3 per topic/step_type combination
 * while preserving ALL approved content. Only reduces unapproved content
 * to make manual review more manageable in the admin interface.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { join } from "path";

config({ path: join(__dirname, "../.env") });
config({ path: join(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const TARGET_VARIATIONS_PER_TOPIC_TYPE = 3; // Keep 2-3 variations per topic/step_type

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Supabase credentials are required");
  console.error("Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or .env.local");
  process.exit(1);
}

if (SUPABASE_URL.includes("dummy") || SUPABASE_SERVICE_ROLE_KEY.includes("dummy")) {
  console.error("❌ Dummy Supabase credentials detected");
  console.error("Please update with real Supabase credentials to reduce content");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ContentItem {
  id: number;
  lesson_slug: string;
  topic_id: string;
  step_type: string;
  title: string;
  is_approved: boolean;
}

async function reduceContent() {
  console.log("🔍 Fetching all content...");
  
  const { data: allContent, error: fetchError } = await supabase
    .from("pre_generated_panels")
    .select("id, lesson_slug, topic_id, step_type, title, is_approved")
    .order("lesson_slug")
    .order("topic_id")
    .order("step_type")
    .order("id");

  if (fetchError) {
    console.error("❌ Failed to fetch content:", fetchError.message);
    process.exit(1);
  }

  if (!allContent || allContent.length === 0) {
    console.log("⚠️  No content found to reduce");
    return;
  }

  console.log(`📊 Found ${allContent.length} total content items`);

  const groups = new Map<string, ContentItem[]>();
  
  for (const item of allContent) {
    const key = `${item.lesson_slug}|${item.topic_id}|${item.step_type}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  console.log(`📋 Found ${groups.size} unique topic/step_type combinations`);

  let totalToDelete = 0;
  const itemsToDelete: number[] = [];

  for (const [key, items] of groups) {
    const [lessonSlug, topicId, stepType] = key.split('|');
    
    const approvedItems = items.filter(item => item.is_approved);
    const unapprovedItems = items.filter(item => !item.is_approved);
    
    console.log(`  📊 ${lessonSlug}/${topicId}/${stepType}: ${items.length} total (${approvedItems.length} approved, ${unapprovedItems.length} unapproved)`);
    
    let toKeep = [...approvedItems];
    let toDelete: ContentItem[] = [];
    
    const remainingSlots = Math.max(0, TARGET_VARIATIONS_PER_TOPIC_TYPE - approvedItems.length);
    
    if (unapprovedItems.length <= remainingSlots) {
      toKeep.push(...unapprovedItems);
      console.log(`  ✅ ${lessonSlug}/${topicId}/${stepType}: keeping all ${items.length} items (${approvedItems.length} approved + ${unapprovedItems.length} unapproved)`);
    } else {
      const shuffledUnapproved = [...unapprovedItems].sort(() => Math.random() - 0.5);
      const unapprovedToKeep = shuffledUnapproved.slice(0, remainingSlots);
      const unapprovedToDelete = shuffledUnapproved.slice(remainingSlots);
      
      toKeep.push(...unapprovedToKeep);
      toDelete = unapprovedToDelete;
      
      console.log(`  🔄 ${lessonSlug}/${topicId}/${stepType}: ${items.length} → ${toKeep.length} (${approvedItems.length} approved + ${unapprovedToKeep.length} unapproved, deleting ${toDelete.length})`);
    }
    
    totalToDelete += toDelete.length;
    itemsToDelete.push(...toDelete.map(item => item.id));
  }

  if (totalToDelete === 0) {
    console.log("✅ No content reduction needed - all groups already have ≤3 variations");
    return;
  }

  console.log(`\n🗑️  Preparing to delete ${totalToDelete} content items...`);
  console.log(`📊 This will reduce content from ${allContent.length} to ${allContent.length - totalToDelete} items`);

  const batchSize = 100;
  let deletedCount = 0;

  for (let i = 0; i < itemsToDelete.length; i += batchSize) {
    const batch = itemsToDelete.slice(i, i + batchSize);
    
    const { error: deleteError } = await supabase
      .from("pre_generated_panels")
      .delete()
      .in("id", batch);

    if (deleteError) {
      console.error(`❌ Failed to delete batch ${Math.floor(i / batchSize) + 1}:`, deleteError.message);
      process.exit(1);
    }

    deletedCount += batch.length;
    console.log(`  ✅ Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(itemsToDelete.length / batchSize)} (${deletedCount}/${totalToDelete} items)`);
  }

  console.log(`\n🎉 Successfully reduced content!`);
  console.log(`📊 Deleted ${deletedCount} items, ${allContent.length - deletedCount} items remaining`);

  const { data: finalContent } = await supabase
    .from("pre_generated_panels")
    .select("lesson_slug, step_type");

  if (finalContent) {
    const finalCounts = finalContent.reduce((acc: any, item) => {
      const key = `${item.lesson_slug}-${item.step_type}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    
    console.log("\n📊 Final content summary:");
    console.table(finalCounts);
  }
}

if (require.main === module) {
  reduceContent().catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
}

export { reduceContent };
