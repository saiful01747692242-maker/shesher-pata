const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach((l) => {
  const i = l.indexOf('=');
  if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^"|"$/g, '');
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await sb.from('books').select('*').limit(1);
  if (error) {
    console.error('Error querying books:', error);
  } else if (data && data[0]) {
    console.log('Columns in books table:', Object.keys(data[0]));
    console.log('Has slug column?', 'slug' in data[0]);
  }
}

run();
