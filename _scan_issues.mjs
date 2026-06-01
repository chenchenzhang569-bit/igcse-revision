     1|// Comprehensive scan: find mislinked notes and past_papers
     2|const KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";
     3|const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";
     4|const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
     5|
     6|async function getJSON(url) {
     7|  const r = await fetch(url, { headers: H });
     8|  if (!r.ok) { console.error(`HTTP ${r.status}: ${url}`); return []; }
     9|  return r.json();
    10|}
    11|
    12|(async () => {
    13|  // 1. Get all subjects
    14|  const subjects = await getJSON(`${API}/subjects?select=id,slug,display_name,code`);
    15|  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));
    16|  console.log("=== Subjects ===");
    17|  subjects.forEach(s => console.log(`  ${s.id.slice(0,8)} ${s.slug} (${s.display_name})`));
    18|
    19|  // 2. Get all topics
    20|  const topics = await getJSON(`${API}/topics?select=id,slug,display_name,subject_id,sort_order`);
    21|  console.log(`\n=== Topics (${topics.length} total) ===`);
    22|  
    23|  // Build topic_id -> subject mapping
    24|  const topicSubjectMap = {};
    25|  for (const t of topics) {
    26|    topicSubjectMap[t.id] = t.subject_id;
    27|  }
    28|
    29|  // 3. Scan all notes
    30|  console.log("\n=== Scanning all notes for mismatches ===");
    31|  let offset = 0;
    32|  let mismatches = [];
    33|  while (true) {
    34|    const notes = await getJSON(`${API}/notes?select=id,title,topic_id,subtopic_id,file_url&limit=1000&offset=${offset}`);
    35|    if (!notes.length) break;
    36|    for (const n of notes) {
    37|      if (!n.topic_id) continue;
    38|      const expectedSubj = topicSubjectMap[n.topic_id];
    39|      if (!expectedSubj) {
    40|        mismatches.push({ ...n, issue: "topic_id not found in topics table" });
    41|        continue;
    42|      }
    43|      // Check if file URL implies a different subject than the topic
    44|      const url = n.file_url || "";
    45|      const urlLower = url.toLowerCase();
    46|      let urlSubject = null;
    47|      if (urlLower.includes("/physics") || urlLower.includes("4ph1")) urlSubject = "physics";
    48|      else if (urlLower.includes("/chemistry") || urlLower.includes("4ch1")) urlSubject = "chemistry";
    49|      else if (urlLower.includes("/biology") || urlLower.includes("4bi1")) urlSubject = "biology";
    50|      else if (urlLower.includes("/math")) urlSubject = "mathematics";
    51|      
    52|      if (urlSubject) {
    53|        const topicSubj = subjectMap[expectedSubj];
    54|        if (topicSubj && !topicSubj.slug.includes(urlSubject) && !topicSubj.display_name.toLowerCase().includes(urlSubject)) {
    55|          mismatches.push({ 
    56|            ...n, 
    57|            issue: `URL subject '${urlSubject}' doesn't match topic's subject '${topicSubj.slug}'`,
    58|            topicSubject: topicSubj.slug
    59|          });
    60|        }
    61|      }
    62|    }
    63|    if (notes.length < 1000) break;
    64|    offset += 1000;
    65|  }
    66|
    67|  console.log(`\n=== Notes mismatches: ${mismatches.length} ===`);
    68|  for (const m of mismatches) {
    69|    console.log(`\n  [${m.issue}]`);
    70|    console.log(`  Title: ${m.title}`);
    71|    console.log(`  topic_id: ${m.topic_id} -> subject: ${m.topicSubject || "unknown"}`);
    72|    console.log(`  URL: ${m.file_url?.slice(0,80)}`);
    73|  }
    74|
    75|  // 4. Scan past_papers similarly
    76|  console.log("\n=== Scanning past_papers for mismatches ===");
    77|  offset = 0;
    78|  let ppMismatches = [];
    79|  while (true) {
    80|    const papers = await getJSON(`${API}/past_papers?select=id,title,paper_type,topic_id,subtopic_id,file_url&limit=1000&offset=${offset}`);
    81|    if (!papers.length) break;
    82|    for (const p of papers) {
    83|      if (!p.topic_id) continue;
    84|      const expectedSubj = topicSubjectMap[p.topic_id];
    85|      if (!expectedSubj) {
    86|        ppMismatches.push({ ...p, issue: "topic_id not found" });
    87|        continue;
    88|      }
    89|    }
    90|    if (papers.length < 1000) break;
    91|    offset += 1000;
    92|  }
    93|  console.log(`past_papers with topic_id not in topics table: ${ppMismatches.length}`);
    94|  for (const m of ppMismatches) {
    95|    console.log(`  ${m.title.slice(0,50)} topic_id=${m.topic_id}`);
    96|  }
    97|
    98|  // 5. Check topic search patterns - verify each frontend topicSlug can find its DB topic
    99|  console.log("\n=== Topic search pattern validation ===");
   100|  const TOPIC_SLUG_TO_DB = {
   101|    "motion-forces-energy": "general-physics",
   102|    "thermal-physics": "physics-0625-thermal-physics",
   103|    "waves": "physics-0625-properties-of-waves",
   104|    "electricity-magnetism": "physics-0625-electricity-and-magnetism",
   105|    "nuclear-physics": "physics-0625-atomic-physics",
   106|    "space-physics": "physics-0625-space-physics",
   107|    "states-of-matter": "caie-chemistry-0620-1-states-of-matter",
   108|    "atoms-elements-compounds": "caie-chemistry-0620-2-atoms-elements-and-compounds",
   109|    "stoichiometry": "caie-chemistry-0620-3-stoichiometry",
   110|    "electrochemistry": "caie-chemistry-0620-4-electrochemistry",
   111|    "chemical-energetics": "caie-chemistry-0620-5-chemical-energetics",
   112|    "chemical-reactions": "caie-chemistry-0620-6-chemical-reactions",
   113|    "acids-bases-salts": "caie-chemistry-0620-7-acids-bases-and-salts",
   114|    "periodic-table": "caie-chemistry-0620-8-the-periodic-table",
   115|    "metals": "caie-chemistry-0620-9-metals",
   116|    "chemistry-environment": "caie-chemistry-0620-10-chemistry-of-the-environment",
   117|    "organic-chemistry": "caie-chemistry-0620-11-organic-chemistry",
   118|    "experimental-techniques": "caie-chemistry-0620-12-experimental-techniques",
   119|    "characteristics-living-organisms": "caie-biology-0610-1-characteristics-and-classification-of-living-organ",
   120|    "organisation-organism": "caie-biology-0610-2-organisation-of-the-organism",
   121|    "movement-cells": "caie-biology-0610-3-movement-into-and-out-of-cells",
   122|    "biological-molecules": "caie-biology-0610-4-biological-molecules",
   123|    "enzymes": "caie-biology-0610-5-enzymes",
   124|    "plant-nutrition": "caie-biology-0610-6-plant-nutrition",
   125|    "human-nutrition": "caie-biology-0610-7-human-nutrition",
   126|    "transport-plants": "caie-biology-0610-8-transport-in-plants",
   127|    "transport-animals": "caie-biology-0610-9-transport-in-animals",
   128|    "diseases-immunity": "caie-biology-0610-10-diseases-and-immunity",
   129|    "gas-exchange-humans": "caie-biology-0610-11-gas-exchange-in-humans",
   130|    "respiration": "caie-biology-0610-12-respiration",
   131|    "excretion-humans": "caie-biology-0610-13-excretion-in-humans",
   132|    "coordination-response": "caie-biology-0610-14-coordination-and-response",
   133|    "drugs": "caie-biology-0610-15-drugs",
   134|    "reproduction": "caie-biology-0610-16-reproduction",
   135|    "inheritance": "caie-biology-0610-17-inheritance",
   136|    "variation-selection": "caie-biology-0610-18-variation-and-selection",
   137|    "organisms-environment": "caie-biology-0610-19-organisms-and-their-environment",
   138|    "biotechnology": "caie-biology-0610-21-biotechnology-and-genetic-engineering",
   139|    "human-influences-ecosystems": "caie-biology-0610-20-human-influences-on-ecosystems",
   140|  };
   141|
   142|  // Check CAIE Physics 0625
   143|  console.log("\n--- CAIE Physics 0625 ---");
   144|  const physTopics = ["motion-forces-energy","thermal-physics","waves","electricity-magnetism","nuclear-physics","space-physics","practical-skills-physics"];
   145|  for (const ts of physTopics) {
   146|    const dbSlug = TOPIC_SLUG_TO_DB[ts] || ts;
   147|    const pat = `*0625*${ts}`;
   148|    const r = await fetch(`${API}/topics?select=id,slug&slug=ilike.${pat}&limit=3`, { headers: H });
   149|    const d = await r.json();
   150|    if (d.length > 0) {
   151|      const found = d.map(x => x.slug);
   152|      console.log(`  ${ts.padEnd(35)} → ${pat.padEnd(45)} → ${found.join(", ")}`);
   153|    } else {
   154|      // Try dbSlug fallback or exact match
   155|      let found = "no match via board pattern";
   156|      if (dbSlug !== ts) {
   157|        const r2 = await fetch(`${API}/topics?select=id,slug&slug=eq.${dbSlug}`, { headers: H });
   158|        const d2 = await r2.json();
   159|        if (d2.length > 0) found = `dbSlug fallback → ${d2[0].slug}`;
   160|      }
   161|      // Try exact slug match
   162|      if (found === "no match via board pattern") {
   163|        const r2 = await fetch(`${API}/topics?select=id,slug&slug=eq.${ts}`, { headers: H });
   164|        const d2 = await r2.json();
   165|        if (d2.length > 0) found = `exact match → ${d2[0].slug}`;
   166|        else found = "NOT FOUND ✗";
   167|      }
   168|      console.log(`  ${ts.padEnd(35)} → ${pat.padEnd(45)} → ${found}`);
   169|    }
   170|  }
   171|
   172|  // Check Edexcel Physics 4ph1
   173|  console.log("\n--- Edexcel Physics 4ph1 ---");
   174|  for (const ts of physTopics) {
   175|    const pat = `*4ph1*${ts}`;
   176|    const r = await fetch(`${API}/topics?select=id,slug&slug=ilike.${pat}&limit=3`, { headers: H });
   177|    const d = await r.json();
   178|    if (d.length > 0) {
   179|      console.log(`  ${ts.padEnd(35)} → ${pat.padEnd(45)} → ${d.map(x => x.slug).join(", ")}`);
   180|    } else {
   181|      let found = "no match";
   182|      // Try exact slug match
   183|      const r2 = await fetch(`${API}/topics?select=id,slug&slug=eq.${ts}`, { headers: H });
   184|      const d2 = await r2.json();
   185|      if (d2.length > 0) found = `exact match → ${d2[0].slug}`;
   186|      else found = "NOT FOUND ✗";
   187|      console.log(`  ${ts.padEnd(35)} → ${pat.padEnd(45)} → ${found}`);
   188|    }
   189|  }
   190|
   191|  // Check Chemistry topics
   192|  console.log("\n--- CAIE Chemistry 0620 ---");
   193|  const chemTopics = Object.keys(TOPIC_SLUG_TO_DB).filter(k => k.includes("-") && !k.includes("physics") && !k.includes("biology") && !k.includes("living") && k !== "motion-forces-energy");
   194|  const chemSlugs = ["states-of-matter","atoms-elements-compounds","stoichiometry","electrochemistry","chemical-energetics","chemical-reactions","acids-bases-salts","periodic-table","metals","chemistry-environment","organic-chemistry","experimental-techniques","practical-skills-chemistry"];
   195|  for (const ts of chemSlugs) {
   196|    const dbSlug = TOPIC_SLUG_TO_DB[ts] || ts;
   197|    const pat = `*0620*${ts}`;
   198|    const r = await fetch(`${API}/topics?select=id,slug&slug=ilike.${pat}&limit=3`, { headers: H });
   199|    const d = await r.json();
   200|    if (d.length > 0) {
   201|      console.log(`  ${ts.padEnd(40)} → ${d.map(x => x.slug).join(", ")}`);
   202|    } else {
   203|      let found = "no match";
   204|      if (dbSlug !== ts) {
   205|        const r2 = await fetch(`${API}/topics?select=id,slug&slug=eq.${dbSlug}`, { headers: H });
   206|        const d2 = await r2.json();
   207|        if (d2.length > 0) found = `dbSlug → ${d2[0].slug}`;
   208|      }
   209|      if (found === "no match") {
   210|        const r2 = await fetch(`${API}/topics?select=id,slug&slug=eq.${ts}`, { headers: H });
   211|        const d2 = await r2.json();
   212|        if (d2.length > 0) found = `exact → ${d2[0].slug}`;
   213|        else found = "NOT FOUND ✗";
   214|      }
   215|      console.log(`  ${ts.padEnd(40)} → ${found}`);
   216|    }
   217|  }
   218|
   219|  // Check Biology topics
   220|  console.log("\n--- CAIE Biology 0610 ---");
   221|  const bioSlugs = ["characteristics-living-organisms","organisation-organism","movement-cells","biological-molecules","enzymes","plant-nutrition","human-nutrition","transport-plants","transport-animals","diseases-immunity","gas-exchange-humans","respiration","excretion-humans","coordination-response","drugs","reproduction","inheritance","variation-selection","organisms-environment","human-influences-ecosystems","biotechnology","practical-skills-biology"];
   222|  for (const ts of bioSlugs) {
   223|    const dbSlug = TOPIC_SLUG_TO_DB[ts] || ts;
   224|    const pat = `*0610*${ts}`;
   225|    const r = await fetch(`${API}/topics?select=id,slug&slug=ilike.${pat}&limit=3`, { headers: H });
   226|    const d = await r.json();
   227|    if (d.length > 0) {
   228|      console.log(`  ${ts.padEnd(42)} → ${d.map(x => x.slug).join(", ")}`);
   229|    } else {
   230|      let found = "no match";
   231|      if (dbSlug !== ts) {
   232|        const r2 = await fetch(`${API}/topics?select=id,slug&slug=eq.${dbSlug}`, { headers: H });
   233|        const d2 = await r2.json();
   234|        if (d2.length > 0) found = `dbSlug → ${d2[0].slug}`;
   235|      }
   236|      if (found === "no match") {
   237|        const r2 = await fetch(`${API}/topics?select=id,slug&slug=eq.${ts}`, { headers: H });
   238|        const d2 = await r2.json();
   239|        if (d2.length > 0) found = `exact → ${d2[0].slug}`;
   240|        else found = "NOT FOUND ✗";
   241|      }
   242|      console.log(`  ${ts.padEnd(42)} → ${found}`);
   243|    }
   244|  }
   245|
   246|})();
   247|