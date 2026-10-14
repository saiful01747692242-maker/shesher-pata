const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    const key = trimmed.substring(0, idx).trim();
    let val = trimmed.substring(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[key] = val;
  }
}
async function check() {
  const bRes = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/books?select=id,title,bangla_name,category,tags,stock', {
    headers: { 'apikey': env.SUPABASE_SERVICE_ROLE_KEY, 'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY }
  });
  const books = await bRes.json();
  console.log('Total books in DB:', books.length);
  console.log('Books summary:');
  books.forEach(b => console.log(`- [${b.id}] "${b.title}" | category: "${b.category}" | stock: ${b.stock}`));
}
check();
