const MISSING = [
  ["Data Storage And Compression", "tqst_ZtxjRzyYV9MWrnQx", "ebbd9fcd-a743-4239-823c-be5b0a9c39f2"],
  ["Methods Of Error Detection", "tqst_Vjkxqxxv2wZ7QYpQ", "42ef927c-c97a-4e26-85e5-db799995150a"],
  ["Encryption", "tqst_xztvyqmYfrBK9pTG", "680984b1-ecb8-44ab-a7c7-c9da95f47e62"],
  ["Computer Architecture", "tqst_N7HsHPcdHjtjbDHD", "f6d7d296-07b9-45aa-bd1a-2f5da79e5d82"],
  ["Network Hardware", "tqst_F6sGcdDtKqwSXcKx", "33cc5b22-c4e4-4506-9812-47e4813cf9ad"],
  ["Types Of Software And Interrupts", "tqst_qyZCtvjFFP5Q8Zjd", "8d4accaa-2230-4e86-8af2-17a02f56404f"],
  ["Automated Systems", "tqst_rQRZxxN4pwQvZ2bM", "56324096-5d6b-4b88-8ec4-98c3d4c60f49"],
  ["Artificial Intelligence", "tqst_yWCWBYTFvsKvPwNv", "f85af556-f2fa-4772-b4aa-ebecf6c99a76"],
  ["Development Life Cycle", "tqst_WR9pKdRBTzGRBQqC", "47bb0bc4-7344-4e2a-96da-69f8e8740c93"],
  ["Computer Sub Systems", "tqst_jsfSBwHx96jd97Z6", "59db297d-329c-4e3d-b20e-2339f2971b4b"],
  ["Algorithms", "tqst_Y4g4QDPT6qFpnG7K", "32e6877b-5db7-41e7-b862-805664f2296d"],
  ["Standard Methods Of A Solution", "tqst_NdzPZBmNw6jZfbgn", "b530da4c-0457-430c-9a3c-6b06bfabc5e8"],
  ["Validation And Verification", "tqst_fN63ybsJfQpKRsWf", "897027a6-65ae-49fe-bc83-8be8b9f5850a"],
  ["Identifying Errors", "tqst_s3njfkXmg5VtVQ64", "3a3cfeb4-0e92-497f-9921-3467d6e7aa55"],
  ["Programming Concepts", "tqst_Kyd9xQWfPcF5SkXh", "b5b43f07-ff53-4842-a0a4-5ef78fc224ce"],
  ["Arrays", "tqst_fgq4Smn7Hgn78jrw", "c968ce50-13f8-48e9-b8f5-8127728094eb"],
  ["Sql", "tqst_FH6SSbrt4KpDgHJz", "65a5bf08-3638-4dd1-aa2d-7f1ca1e5b4bd"],
  ["Boolean Logic", "tqst_jpqZ2YP8Hxg45VHZ", "c3da8c75-0565-4dd0-8e46-1c43a289a8dd"],
];

async function go() {
  let ok = 0, fail = 0;
  for (let i = 0; i < MISSING.length; i++) {
    const [name, qsId, subId] = MISSING[i];
    try {
      const r = await fetch("/api/admin/download-sme-ms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qsId, subId, displayName: name }),
      });
      const j = await r.json();
      if (r.ok) { console.log(`[${i+1}/18] ${name} ✅`); ok++; }
      else { console.log(`[${i+1}/18] ${name} ❌ ${JSON.stringify(j)}`); fail++; }
    } catch (e) {
      console.log(`[${i+1}/18] ${name} ❌ ${e.message}`); fail++;
    }
  }
  console.log(`\n=== ${ok} ok, ${fail} fail ===`);
}
go();
