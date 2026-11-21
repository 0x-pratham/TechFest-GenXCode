import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

export const getCachedEventSchedule = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("event_details")
      .select("id,day_number,title,venue,timing,pre_instructions")
      .eq("is_published", true)
      .order("day_number")
      .order("created_at");
    return data ?? [];
  },
  ["event-schedule-v1"],
  { revalidate: 300, tags: ["event-schedule"] } // 5-minute TTL + instant tag purge
);

export const getCachedScheduleSettings = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("event_schedule_settings")
      .select("day_count,whatsapp_channel_url")
      .eq("id", 1)
      .maybeSingle();
    return data ?? { day_count: 1, whatsapp_channel_url: null };
  },
  ["event-settings-v1"],
  { revalidate: 300, tags: ["event-settings"] }
);

export const getCachedProblemStatements = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("problem_statements")
      .select("id,title,summary,domain,difficulty,max_slots,filled_slots")
      .eq("is_active", true)
      .order("display_order");
    return data ?? [];
  },
  ["problem-statements-v1"],
  { revalidate: 60, tags: ["problem-statements"] } // 60s TTL + instant purge on slot claim
);