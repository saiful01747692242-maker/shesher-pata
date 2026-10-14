const { Client } = require('pg');

async function migrateSlug() {
  const client = new Client({
    host: 'aws-0-ap-southeast-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.tbgtvrveyjuupqbcldya',
    password: 'sesherpata12@#',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();
    console.log('Connected to PG successfully.');

    await client.query(`
      ALTER TABLE public.books ADD COLUMN IF NOT EXISTS slug TEXT;
      CREATE INDEX IF NOT EXISTS idx_books_slug ON public.books(slug);
    `);
    console.log('Successfully ensured `slug` column and index on `public.books`!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

migrateSlug();
