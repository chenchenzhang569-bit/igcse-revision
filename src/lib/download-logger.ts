import { createClient } from "@supabase/supabase-js";

export async function logDownload(opts: {
  userId: string;
  noteId?: string;
  fileName?: string;
  subjectId?: string;
  pageUrl?: string;
}) {
  try {
    const supabase = createClient(
      "https://aondldqwwvttwpervrfq.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );
    await supabase.from("activity_logs").insert({
      user_id: opts.userId,
      activity_type: "download:note",
      subject_id: opts.subjectId || null,
      detail: opts.fileName || `note:${opts.noteId || ""}`,
      page_url: opts.pageUrl || "",
    });
  } catch {
    // silent fail — logging should never break downloads
  }
}
