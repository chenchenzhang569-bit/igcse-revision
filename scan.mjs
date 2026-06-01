const KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL";
const API = "https://aondldqwwvttwpervrfq.supabase.co/rest/v1";
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function getJSON(url) {
  const r = await fetch(url, { headers: H });
  if (!r.ok) { console.error(`HTTP ${r.status}: ${url}`); return []; }
  return r.json();
}

(async () => {
  // 1. Get all subjects + topics
  const subjects = await getJSON(`${API}/subjects?select=id,slug,display_name,code`);
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));
  console.log("=== Subjects ===");
  subjects.forEach(s => console.log(`  ${s.id.slice(0,8)} ${s.slug.padEnd(30)} ${s.display_name}`));

  const topics = await getJSON(`${API}/topics?select=id,slug,display_name,subject_id,sort_order`);
  const topicSubjectMap = {};
  for (const t of topics) topicSubjectMap[t.id] = t.subject_id;
  console.log(`\n=== Topics: ${topics.length} total ===`);

  // 2. Notes: find URL subject vs topic subject mismatches
  console.log("\n=== MISMATCHED NOTES (URL path != topic's subject) ===");
  let offset = 0, mismatches = [];
  while (true) {
    const notes = await getJSON(`${API}/notes?select=id,title,topic_id,subtopic_id,file_url&limit=1000&offset=${offset}`);
    if (!notes.length) break;
    for (const n of notes) {
      if (!n.topic_id) continue;
      const subjId = topicSubjectMap[n.topic_id];
      if (!subjId) { mismatches.push({...n, issue:"topic_id orphan"}); continue; }
      const url = (n.file_url || "").toLowerCase();
      const subj = subjectMap[subjId];
      if (!subj) continue;
      // Check URL path vs subject slug
      const subjSlug = subj.slug.toLowerCase();
      if (url.includes("/physics") && !subjSlug.includes("physics")) mismatches.push({...n, issue:`URL=physics but topic subject=${subj.slug}`});
      if (url.includes("/chemistry") && !subjSlug.includes("chemistry")) mismatches.push({...n, issue:`URL=chemistry but topic subject=${subj.slug}`});
      if (url.includes("/biology") && !subjSlug.includes("biology")) mismatches.push({...n, issue:`URL=biology but topic subject=${subj.slug}`});
      if (url.includes("/math") && subjSlug.includes("additional")) continue; // additional maths has /math in path
      if ((url.includes("/math") || url.includes("0580") || url.includes("4ma1")) && !subjSlug.includes("math") && !subjSlug.includes("additional")) mismatches.push({...n, issue:`URL=math but topic subject=${subj.slug}`});
    }
    if (notes.length < 1000) break;
    offset += 1000;
  }
  console.log(`Found ${mismatches.length} mismatches`);
  for (const m of mismatches) {
    console.log(`  [${m.issue}]`);
    console.log(`    Title: ${m.title.slice(0,60)}`);
    console.log(`    topic_id: ${m.topic_id.slice(0,8)} subtopic_id: ${(m.subtopic_id||"").slice(0,8)}`);
    console.log(`    URL: ${(m.file_url||"").slice(0,80)}`);
  }

  // 3. Past papers: similar check
  console.log("\n=== MISMATCHED PAST PAPERS ===");
  offset = 0; mismatches = [];
  while (true) {
    const papers = await getJSON(`${API}/past_papers?select=id,title,paper_type,topic_id,subtopic_id,file_url&limit=1000&offset=${offset}`);
    if (!papers.length) break;
    for (const p of papers) {
      if (!p.topic_id) continue;
      const subjId = topicSubjectMap[p.topic_id];
      if (!subjId) { mismatches.push({...p, issue:"topic_id orphan"}); continue; }
    }
    if (papers.length < 1000) break;
    offset += 1000;
  }
  console.log(`Found ${mismatches.length} mismatches`);
  for (const m of mismatches) {
    console.log(`  [${m.issue}] title=${m.title.slice(0,50)} topic_id=${m.topic_id.slice(0,8)}`);
  }

  // 4. Topic search validation
  console.log("\n=== TOPIC SEARCH PATTERN VALIDATION ===");
  const TOPIC_SLUG_TO_DB = {
    "motion-forces-energy": "general-physics",
    "thermal-physics": "physics-0625-thermal-physics",
    "waves": "physics-0625-properties-of-waves",
    "electricity-magnetism": "physics-0625-electricity-and-magnetism",
    "nuclear-physics": "physics-0625-atomic-physics",
    "space-physics": "physics-0625-space-physics",
    "states-of-matter": "caie-chemistry-0620-1-states-of-matter",
    "atoms-elements-compounds": "caie-chemistry-0620-2-atoms-elements-and-compounds",
    "stoichiometry": "caie-chemistry-0620-3-stoichiometry",
    "electrochemistry": "caie-chemistry-0620-4-electrochemistry",
    "chemical-energetics": "caie-chemistry-0620-5-chemical-energetics",
    "chemical-reactions": "caie-chemistry-0620-6-chemical-reactions",
    "acids-bases-salts": "caie-chemistry-0620-7-acids-bases-and-salts",
    "periodic-table": "caie-chemistry-0620-8-the-periodic-table",
    "metals": "caie-chemistry-0620-9-metals",
    "chemistry-environment": "caie-chemistry-0620-10-chemistry-of-the-environment",
    "organic-chemistry": "caie-chemistry-0620-11-organic-chemistry",
    "experimental-techniques": "caie-chemistry-0620-12-experimental-techniques",
    "characteristics-living-organisms": "caie-biology-0610-1-characteristics-and-classification-of-living-organ",
    "organisation-organism": "caie-biology-0610-2-organisation-of-the-organism",
    "movement-cells": "caie-biology-0610-3-movement-into-and-out-of-cells",
    "biological-molecules": "caie-biology-0610-4-biological-molecules",
    "enzymes": "caie-biology-0610-5-enzymes",
    "plant-nutrition": "caie-biology-0610-6-plant-nutrition",
    "human-nutrition": "caie-biology-0610-7-human-nutrition",
    "transport-plants": "caie-biology-0610-8-transport-in-plants",
    "transport-animals": "caie-biology-0610-9-transport-in-animals",
    "diseases-immunity": "caie-biology-0610-10-diseases-and-immunity",
    "gas-exchange-humans": "caie-biology-0610-11-gas-exchange-in-humans",
    "respiration": "caie-biology-0610-12-respiration",
    "excretion-humans": "caie-biology-0610-13-excretion-in-humans",
    "coordination-response": "caie-biology-0610-14-coordination-and-response",
    "drugs": "caie-biology-0610-15-drugs",
    "reproduction": "caie-biology-0610-16-reproduction",
    "inheritance": "caie-biology-0610-17-inheritance",
    "variation-selection": "caie-biology-0610-18-variation-and-selection",
    "organisms-environment": "caie-biology-0610-19-organisms-and-their-environment",
    "biotechnology": "caie-biology-0610-21-biotechnology-and-genetic-engineering",
    "human-influences-ecosystems": "caie-biology-0610-20-human-influences-on-ecosystems",
  };

  const boards = [
    { label: "CAIE Physics 0625", code: "0625", slugs: ["motion-forces-energy","thermal-physics","waves","electricity-magnetism","nuclear-physics","space-physics","practical-skills-physics"] },
    { label: "Edexcel Physics 4ph1", code: "4ph1", slugs: ["motion-forces-energy","thermal-physics","waves","electricity-magnetism","nuclear-physics","space-physics","practical-skills-physics"] },
    { label: "CAIE Chemistry 0620", code: "0620", slugs: ["states-of-matter","atoms-elements-compounds","stoichiometry","electrochemistry","chemical-energetics","chemical-reactions","acids-bases-salts","periodic-table","metals","chemistry-environment","organic-chemistry","experimental-techniques","practical-skills-chemistry"] },
    { label: "Edexcel Chemistry 4ch1", code: "4ch1", slugs: ["states-of-matter","atoms-elements-compounds","stoichiometry","electrochemistry","chemical-energetics","chemical-reactions","acids-bases-salts","periodic-table","metals","chemistry-environment","organic-chemistry","experimental-techniques","practical-skills-chemistry"] },
    { label: "CAIE Biology 0610", code: "0610", slugs: ["characteristics-living-organisms","organisation-organism","movement-cells","biological-molecules","enzymes","plant-nutrition","human-nutrition","transport-plants","transport-animals","diseases-immunity","gas-exchange-humans","respiration","excretion-humans","coordination-response","drugs","reproduction","inheritance","variation-selection","organisms-environment","human-influences-ecosystems","biotechnology","practical-skills-biology"] },
    { label: "Edexcel Biology 4bi1", code: "4bi1", slugs: ["characteristics-living-organisms","organisation-organism","movement-cells","biological-molecules","enzymes","plant-nutrition","human-nutrition","transport-plants","transport-animals","diseases-immunity","gas-exchange-humans","respiration","excretion-humans","coordination-response","drugs","reproduction","inheritance","variation-selection","organisms-environment","human-influences-ecosystems","biotechnology","practical-skills-biology"] },
  ];

  for (const board of boards) {
    console.log(`\n--- ${board.label} ---`);
    for (const ts of board.slugs) {
      const dbSlug = TOPIC_SLUG_TO_DB[ts] || ts;
      const pat = `*${board.code}*${ts}`;
      let result;
      const r = await fetch(`${API}/topics?select=id,slug&slug=ilike.${pat}&limit=3`, { headers: H });
      const d = await r.json();
      if (d.length > 0) {
        result = `✓ ${d.map(x => x.slug).join(", ")}`;
      } else if (dbSlug !== ts) {
        const r2 = await fetch(`${API}/topics?select=id,slug&slug=eq.${dbSlug}`, { headers: H });
        const d2 = await r2.json();
        result = d2.length > 0 ? `✓ (dbSlug → ${d2[0].slug})` : "✗ dbSlug not found";
      } else {
        const r3 = await fetch(`${API}/topics?select=id,slug&slug=eq.${ts}`, { headers: H });
        const d3 = await r3.json();
        result = d3.length > 0 ? `✓ (exact → ${d3[0].slug})` : "✗ NOT FOUND";
      }
      console.log(`  ${ts.padEnd(44)} ${result}`);
    }
  }
})();
