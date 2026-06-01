const H = { apikey: "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL", Authorization: "Bearer sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL" };
const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";
const physTopicId = "5d8c1fe1-669d-4d07-9953-69449abfddf7";
const physSubId = "bc98bf28-f80e-4346-8c9d-f92d38c69844";
const noteIds = [
  "139c331c-9a56-43ee-b01b-2a3b10e9abb3",
  "11103003-cd9b-4783-9577-e87b596030fc",
  "0d56df7f-3c3d-42bc-aa3e-419acb36e8c5",
  "6117c647-02d4-4d2c-aab4-e81b7ef6d50a"
];
(async () => {
  for (const id of noteIds) {
    const r = await fetch(API + "/notes?id=eq." + id, {
      method: "PATCH",
      headers: { ...H, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ topic_id: physTopicId, subtopic_id: physSubId })
    });
    console.log("Note", id.slice(0,8), "\u2192 status", r.status);
  }
  // Verify
  const check = await fetch(API + "/notes?select=id,title,topic_id,subtopic_id&id=in.(" + noteIds.join(",") + ")", { headers: H });
  const data = await check.json();
  console.log("\nAfter update:");
  data.forEach((n) => console.log(" ", n.title.slice(0,50), "\u2192 topic:", n.topic_id.slice(0,8), "sub:", n.subtopic_id.slice(0,8)));
})();
