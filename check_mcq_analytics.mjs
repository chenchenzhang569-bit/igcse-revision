import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  // Check for mcq tab pageviews
  const { data, error } = await supabase
    .from('pageviews')
    .select('path, count')
    .ilike('path', '%tab=mcq%')
    .gte('created_at', new Date(Date.now() - 3600000).toISOString())
    .limit(20);
  
  if (error) { console.log('Query error:', error.message); return; }
  console.log('MCQ tab views (last 1h):', data?.length || 0);
  data?.forEach(d => console.log('  ', d.path, '-', d.count));
  
  // Top recent paths
  const { data: all } = await supabase
    .from('pageviews')
    .select('path, count')
    .gte('created_at', new Date(Date.now() - 3600000).toISOString())
    .order('count', { ascending: false })
    .limit(10);
  console.log('\nTop pageviews last hour:');
  all?.forEach(d => console.log('  ', d.path, '-', d.count));
}
check().catch(console.error);
