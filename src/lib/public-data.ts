import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Service = {
  id: string; slug: string; specialty_code: string | null; name: string; name_en: string | null; summary: string;
  description: string | null; conditions: string[]; access_steps: string[]; instructions: string[]; icon: string | null;
};

export const getCms = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("cms_blocks").select("key, content");
  const map: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  (data ?? []).forEach((r) => (map[r.key] = r.content));
  return map;
});

export const getServices = cache(async (): Promise<Service[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("services").select("*").eq("is_published", true).order("sort");
  return (data ?? []) as Service[];
});

export const getFaqs = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("faqs").select("id, question, answer, category").eq("is_published", true).order("sort");
  return data ?? [];
});

export const getSpecialties = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("specialties").select("code, name, name_en").order("sort");
  return data ?? [];
});
