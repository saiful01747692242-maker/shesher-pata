const { Client } = require('pg');

async function test() {
  const client = new Client({
    host: 'aws-0-ap-southeast-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.tbgtvrveyjuupqbcldya',
    password: 'sesherpata12@#',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  await client.connect();
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
  console.log('Public tables:', res.rows.map(r => r.table_name));

  // Check columns if banners or coupons exist
  for (const t of ['banners', 'coupons']) {
    const colRes = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${t}' ORDER BY ordinal_position;`);
    if (colRes.rows.length > 0) {
      console.log(`Table ${t} columns:`, colRes.rows);
    } else {
      console.log(`Table ${t} does NOT exist yet.`);
    }
  }

  // Check storage buckets
  const bRes = await client.query("SELECT id, name, public FROM storage.buckets;");
  console.log('Storage buckets:', bRes.rows);

  await client.end();
}

test().catch(e => console.error('Error:', e.message));
