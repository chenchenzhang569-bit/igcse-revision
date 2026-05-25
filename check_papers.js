const { createClient } = require('@supabase/supabase-js');

// Read env manually - handle multiline keys
const fs = require('fs');
const envRaw = fs.readFileSync('.env.local', 'utf8');
const env = {};
let currentKey = null;
let currentVal = '';
for (const line of envRaw.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)/);
  if (m) {
    if (currentKey) { env[currentKey] = currentVal.trim(); }
    currentKey = m[1];
    currentVal = m[2];
  } else if (currentKey && line.trim()) {
    currentVal += line.trim();
  }
}
if (currentKey) env[currentKey] = currentVal.trim();

console.log('URL:', env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Key starts:', env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');
console.log('Key length:', env.SUPABASE_SERVICE_ROLE_KEY?.length);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Try with anon key as fallback
  let client = supabase;
  
  let { data: all, error } = await client.from('past_papers').select('id, title, year, season, subject_id').limit(5000);
  
  if (error) {
    console.log('Service role key failed:', error.message);
    // Try anon key
    const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    console.log('Anon key length:', anonKey?.length);
    client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, anonKey);
    const r = await client.from('past_papers').select('id, title, year, season, subject_id').limit(5000);
    all = r.data;
    error = r.error;
    if (error) {
      console.log('Anon key also failed:', error.message);
      return;
    }
  }
  
  if (!all) { console.log('No data'); return; }
  
  console.log(`\nTotal papers: ${all.length}\n`);
  
  // Get subject names
  const subjectIds = [...new Set(all.map(p => p.subject_id))];
  const { data: subjects } = await client.from('subjects').select('id,name,code').in('id', subjectIds);
  const subjMap = {};
  if (subjects) subjects.forEach(s => subjMap[s.id] = `${s.name} · ${s.code}`);
  
  // Count by subject
  const bySubject = {};
  for (const p of all) {
    const sid = p.subject_id;
    if (!bySubject[sid]) bySubject[sid] = { total: 0, noYear: 0, noSeason: 0, noBoth: 0 };
    bySubject[sid].total++;
    if (p.year == null) bySubject[sid].noYear++;
    if (p.season == null || p.season === '') bySubject[sid].noSeason++;
    if ((p.year == null) && (p.season == null || p.season === '')) bySubject[sid].noBoth++;
  }
  
  console.log('Papers with NULL year/season:');
  for (const [sid, stats] of Object.entries(bySubject)) {
    const name = subjMap[sid] || sid;
    if (stats.noBoth > 0 || stats.noYear > 0 || stats.noSeason > 0) {
      console.log(`  ❌ ${name}: total=${stats.total}, noYear=${stats.noYear}, noSeason=${stats.noSeason}, noBoth=${stats.noBoth}`);
    } else {
      console.log(`  ✅ ${name}: total=${stats.total}`);
    }
  }
  
  // Show problem papers
  const problemPapers = all.filter(p => p.year == null || p.season == null || p.season === '');
  if (problemPapers.length > 0) {
    console.log(`\nProblem papers (${problemPapers.length}):`);
    problemPapers.slice(0, 30).forEach(p => {
      console.log(`  id=${p.id} | year=${p.year} | season="${p.season||''}" | sid=${p.subject_id} | title=${(p.title||'').substring(0,60)}`);
    });
  }
  
  // Also show ALL papers for chemistry & biology to understand the data
  const chemBioIds = [];
  for (const [sid, name] of Object.entries(subjMap)) {
    if (name.toLowerCase().includes('chem') || name.toLowerCase().includes('biol')) {
      chemBioIds.push(sid);
    }
  }
  if (chemBioIds.length > 0) {
    const chemBio = all.filter(p => chemBioIds.includes(p.subject_id));
    console.log(`\n=== ALL Chemistry/Biology papers (${chemBio.length}) ===`);
    chemBio.forEach(p => {
      const name = subjMap[p.subject_id] || p.subject_id;
      console.log(`  ${name} | year=${p.year} | season="${p.season||''}" | title=${(p.title||'').substring(0,60)}`);
    });
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
