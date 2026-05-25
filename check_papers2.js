const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envRaw = fs.readFileSync('.env.local', 'utf8');
const env = {};
let curKey = null, curVal = '';
for (const line of envRaw.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)/);
  if (m) {
    if (curKey) env[curKey] = curVal.trim();
    curKey = m[1]; curVal = m[2];
  } else if (curKey && line.trim()) curVal += line.trim();
}
if (curKey) env[curKey] = curVal.trim();

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  // Get subject IDs for biology and chemistry
  const { data: subjects } = await supabase.from('subjects').select('id,name,code');
  const subjMap = {};
  subjects.forEach(s => subjMap[s.id] = s);
  
  // Get bio papers
  const bio = subjects.find(s => s.code === '0610');
  const chem = subjects.find(s => s.code === '0620');
  
  if (bio) {
    const { data: bioPapers } = await supabase.from('past_papers')
      .select('id, title, year, season, paper_number, paper_type, file_url')
      .eq('subject_id', bio.id)
      .eq('year', 2019).eq('season', 'May/Jun')
      .order('paper_number')
      .limit(100);
    
    console.log('=== Biology 2019 May/Jun papers ===');
    console.log(`Total: ${bioPapers?.length || 0}\n`);
    if (bioPapers) {
      // Show unique paper_numbers and their types
      const byNum = {};
      for (const p of bioPapers) {
        const n = p.paper_number;
        if (!byNum[n]) byNum[n] = [];
        byNum[n].push({ type: p.paper_type || 'NULL', title: p.title?.substring(0, 60) });
      }
      for (const [num, items] of Object.entries(byNum).sort((a,b) => +a[0] - +b[0])) {
        console.log(`Paper ${num}: ${items.length} entries`);
        items.forEach(i => console.log(`  paper_type="${i.type}" | ${i.title}`));
      }
    }
  }
  
  if (chem) {
    const { data: chemPapers } = await supabase.from('past_papers')
      .select('id, title, year, season, paper_number, paper_type, file_url')
      .eq('subject_id', chem.id)
      .order('year')
      .limit(100);
    
    console.log('\n=== Chemistry ALL papers ===');
    console.log(`Total: ${chemPapers?.length || 0}\n`);
    
    const byGroup = {};
    for (const p of chemPapers) {
      const k = `${p.year}-${p.season}`;
      if (!byGroup[k]) byGroup[k] = [];
      byGroup[k].push(p);
    }
    for (const [key, items] of Object.entries(byGroup)) {
      console.log(`\nGroup: ${key} (${items.length} papers)`);
      items.forEach(i => {
        console.log(`  paper_number=${i.paper_number} paper_type="${i.paper_type || 'NULL'}" | ${i.title?.substring(0,60)}`);
      });
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
