"use server";

import { createClient } from "@supabase/supabase-js";
import { LLPData } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Note: In a production app with SSR/Server Components, we would use
// @supabase/ssr to handle sessions via cookies. 
// For this refactor, we are moving the logic to the server first.
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getAgreement(id: string, userId: string) {
  const { data, error } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching agreement:", error.message);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export async function createAgreement(userId: string, initialData: LLPData) {
  const { data, error } = await supabase
    .from("agreements")
    .insert([{ 
      data: initialData, 
      step: "num_partners", 
      is_done: false, 
      user_id: userId 
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating agreement:", error.message);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export async function updateAgreement(id: string, updates: { data: LLPData, step: string, is_done: boolean }) {
  const { error } = await supabase
    .from("agreements")
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating agreement:", error.message);
    return { error: error.message };
  }
  return { error: null };
}
