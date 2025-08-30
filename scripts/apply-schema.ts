#!/usr/bin/env tsx

/**
 * Apply Database Schema for Pre-Generated Content
 * 
 * This script applies the database schema for storing pre-generated panel content.
 * It uses the Supabase client to execute the SQL commands.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

config({ path: join(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Supabase credentials are required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applySchema() {
  console.log("🗄️  Applying pre-generated content schema...");
  
  try {
    const schemaPath = join(__dirname, "../supabase/pre_generated_content_schema.sql");
    const schemaSQL = readFileSync(schemaPath, "utf-8");
    
    const statements = schemaSQL
      .split(";")
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith("--"));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.toLowerCase().includes("begin") || statement.toLowerCase().includes("commit")) {
        continue; // Skip transaction statements as Supabase handles them
      }
      
      console.log(`  ⚡ Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc("exec_sql", { sql: statement });
      
      if (error) {
        console.error(`    ❌ Failed to execute statement ${i + 1}:`, error.message);
        console.error(`    Statement: ${statement.substring(0, 100)}...`);
      } else {
        console.log(`    ✅ Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log("✅ Schema application completed!");
    
    const { data, error } = await supabase
      .from("pre_generated_panels")
      .select("count(*)")
      .limit(1);
    
    if (error) {
      console.error("❌ Failed to verify table creation:", error.message);
    } else {
      console.log("✅ Table verification successful - pre_generated_panels table is ready");
    }
    
  } catch (error: any) {
    console.error("💥 Schema application failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  applySchema();
}

export { applySchema };
