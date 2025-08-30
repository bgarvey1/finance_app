#!/usr/bin/env tsx

/**
 * Content Pre-Generation Script for Finance Tutor
 * 
 * This script generates multiple variations of panel content for each topic
 * in the progression system, storing them in the database for fast retrieval
 * during user sessions. This eliminates the need for real-time OpenAI API calls.
 */

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { getProgressionForLesson, getSupportedLessonSlugs, type Topic } from "../src/content/progressions";
import type { Step } from "../src/lib/tutor/types";
import { config } from "dotenv";
import { join } from "path";

config({ path: join(__dirname, "../.env.local") });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_APIKEY || "";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const MODEL_TUTOR = process.env.MODEL_TUTOR || "gpt-4o-mini";
const TUTOR_TONE = process.env.TUTOR_TONE || "";

const VARIATIONS_PER_TOPIC = 20; // Generate 20 variations per topic
const GENERATION_TIMEOUT_MS = 10000; // 10 second timeout per generation

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is required");
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Supabase credentials are required");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function systemPromptTopic(topic: Topic) {
  return `
You are a patient, engaging finance tutor for ages 18–21.

Generate a single "step" JSON strictly about the CURRENT TOPIC below. Do NOT drift to other topics.
Keep copy concise and concrete. Body ≤120 words, example ≤90 words. Use relatable teen/college scenarios.
Explicitly mention any key term(s) named in the objective at least once (e.g., "double coincidence of wants").
Tone/style: ${TUTOR_TONE}

CURRENT TOPIC:
- id: ${topic.id}
- title: ${topic.title}
- objective: ${topic.objective}
- concept_tags: ${JSON.stringify(topic.concept_tags)}

Allowed shapes:

{
  "step": {
    "type": "panel" | "reteach",
    "title": "short title",
    "body_md": "≤120 words, focused on this topic only",
    "example_md": "≤90 words, concrete",
    "concept_tags": ${JSON.stringify(topic.concept_tags)}
  }
}

or

{
  "step": {
    "type": "question",
    "title": "short title",
    "body_md": "brief lead‑in (≤60 words)",
    "concept_tags": ${JSON.stringify(topic.concept_tags)},
    "question": {
      "type": "mcq" | "numeric",
      "prompt": "question text (within this topic only)",
      "choices": [{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],
      "correct_answer": "A" | "B" | "C" | "D" | "42",
      "explanation": "brief, grounded explanation about this topic",
      "difficulty": "easy" | "medium" | "hard"
    }
  }
}

or

{
  "step": {
    "type": "summary",
    "title": "Wrap‑up",
    "body_md": "key takeaways for this topic (≤120 words)",
    "concept_tags": ${JSON.stringify(topic.concept_tags)}
  }
}
`;
}

function buildUserPromptTopic(
  lessonSlug: string,
  topic: Topic,
  stepType: "panel" | "reteach" | "question" | "summary",
  variationNumber: number
) {
  const policy = `
Policy:
- Generate a "${stepType}" step for this topic
- Make this variation ${variationNumber} unique and engaging while staying on topic
- Use different examples, analogies, and framings from other variations
- Stay strictly on THIS topic. Do not introduce future topics or unrelated content.
- If stepType="question", craft a real question grounded in the objective; DO NOT use generic meta prompts like "Which statement best matches...". Prefer concrete MCQ or numeric questions with content-anchored distractors.
`;

  return `
Lesson slug: ${lessonSlug}
Current topic: ${topic.id} (${topic.title})
Variation: ${variationNumber} of ${VARIATIONS_PER_TOPIC}

${policy}

forcedType: ${stepType}

Respond with a single JSON object "step" matching the schema exactly. No extra keys. No prose outside JSON.
`;
}

async function generateContentForTopic(
  lessonSlug: string,
  topic: Topic,
  topicIndex: number
): Promise<void> {
  console.log(`\n📝 Generating content for topic: ${topic.id} (${topic.title})`);
  
  const stepTypes: Array<"panel" | "reteach" | "question" | "summary"> = ["panel", "reteach", "question", "summary"];
  const variationsPerType = Math.ceil(VARIATIONS_PER_TOPIC / stepTypes.length);
  
  for (const stepType of stepTypes) {
    console.log(`  🔄 Generating ${variationsPerType} ${stepType} variations...`);
    
    for (let variation = 1; variation <= variationsPerType; variation++) {
      try {
        const systemPrompt = systemPromptTopic(topic);
        const userPrompt = buildUserPromptTopic(lessonSlug, topic, stepType, variation);
        const input = `${systemPrompt}\n\n${userPrompt}`;
        
        const completion = await Promise.race([
          openai.chat.completions.create({
            model: MODEL_TUTOR,
            messages: [{ role: "user", content: input }],
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Generation timeout")), GENERATION_TIMEOUT_MS)
          ),
        ]);
        
        let content = completion.choices[0]?.message?.content || "";
        
        const jsonMatch = content.match(/```json\s*([\s\S]*?)```/i);
        if (jsonMatch) content = jsonMatch[1];
        
        const parsed = JSON.parse(content);
        
        if (!parsed || typeof parsed !== "object" || !parsed.step) {
          throw new Error("Invalid step payload from model");
        }
        
        const step: Step = parsed.step as Step;
        
        step.concept_tags = topic.concept_tags;
        
        const bodyWordCount = (step as any).body_md ? (step as any).body_md.split(/\s+/).length : 0;
        const exampleWordCount = (step as any).example_md ? (step as any).example_md.split(/\s+/).length : 0;
        
        const insertData = {
          lesson_slug: lessonSlug,
          topic_id: topic.id,
          topic_index: topicIndex,
          step_type: step.type,
          title: step.title,
          body_md: (step as any).body_md || "",
          example_md: (step as any).example_md || "",
          concept_tags: JSON.stringify(step.concept_tags),
          generated_with_model: MODEL_TUTOR,
          word_count_body: bodyWordCount,
          word_count_example: exampleWordCount,
          question_type: (step as any).question?.type || null,
          question_prompt: (step as any).question?.prompt || null,
          question_choices: (step as any).question?.choices ? JSON.stringify((step as any).question.choices) : null,
          correct_answer: (step as any).question?.correct_answer || null,
          explanation: (step as any).question?.explanation || null,
          difficulty: (step as any).question?.difficulty || null,
        };
        
        const { error } = await supabase
          .from("pre_generated_panels")
          .insert(insertData);
        
        if (error) {
          console.error(`    ❌ Failed to store ${stepType} variation ${variation}:`, error.message);
        } else {
          console.log(`    ✅ Stored ${stepType} variation ${variation} (${bodyWordCount}w body, ${exampleWordCount}w example)`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        console.error(`    ❌ Failed to generate ${stepType} variation ${variation}:`, error.message);
      }
    }
  }
}

async function generateContentForLesson(lessonSlug: string): Promise<void> {
  console.log(`\n🚀 Starting content generation for lesson: ${lessonSlug}`);
  
  const progression = getProgressionForLesson(lessonSlug);
  if (progression.length === 0) {
    console.log(`⚠️  No progression found for lesson: ${lessonSlug}`);
    return;
  }
  
  console.log(`📚 Found ${progression.length} topics in progression`);
  
  for (let i = 0; i < progression.length; i++) {
    const topic = progression[i];
    await generateContentForTopic(lessonSlug, topic, i);
  }
  
  console.log(`✅ Completed content generation for lesson: ${lessonSlug}`);
}

async function main() {
  console.log("🎯 Finance Tutor Content Pre-Generation Script");
  console.log(`📊 Generating ${VARIATIONS_PER_TOPIC} variations per topic`);
  console.log(`🤖 Using model: ${MODEL_TUTOR}`);
  console.log(`⏱️  Timeout: ${GENERATION_TIMEOUT_MS}ms per generation`);
  
  console.log("\n🗑️  Clearing existing pre-generated content...");
  const { error: clearError } = await supabase
    .from("pre_generated_panels")
    .delete()
    .neq("id", 0); // Delete all rows
  
  if (clearError) {
    console.error("❌ Failed to clear existing content:", clearError.message);
  } else {
    console.log("✅ Cleared existing content");
  }
  
  const lessonSlugs = getSupportedLessonSlugs();
  console.log(`\n📋 Found ${lessonSlugs.length} lessons to process:`, lessonSlugs);
  
  for (const lessonSlug of lessonSlugs) {
    await generateContentForLesson(lessonSlug);
  }
  
  const { data: stats, error: statsError } = await supabase
    .from("pre_generated_panels")
    .select("lesson_slug, step_type");
  
  if (statsError) {
    console.error("❌ Failed to get statistics:", statsError.message);
  } else {
    const grouped = stats?.reduce((acc: any, row: any) => {
      const key = `${row.lesson_slug}-${row.step_type}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    
    console.log("\n📊 Generation Summary:");
    console.table(grouped);
  }
  
  console.log("\n🎉 Content pre-generation completed!");
  console.log("💡 Next steps:");
  console.log("   1. Review generated content in the database");
  console.log("   2. Use admin interface to approve high-quality content");
  console.log("   3. Update API to use pre-generated content instead of OpenAI calls");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
}

export { generateContentForTopic, generateContentForLesson };
