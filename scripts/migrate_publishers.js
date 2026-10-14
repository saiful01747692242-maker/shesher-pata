const { Client } = require('pg');

async function createPublishers() {
  const client = new Client({
    host: 'aws-0-ap-southeast-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.tbgtvrveyjuupqbcldya',
    password: 'sesherpata12@#',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  await client.connect();
  console.log('Connected to PG!');

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.publishers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      location TEXT,
      established TEXT,
      logo TEXT,
      book_count INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    ALTER TABLE public.publishers ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public read publishers" ON public.publishers;
    CREATE POLICY "Public read publishers"
      ON public.publishers FOR SELECT
      TO anon, authenticated
      USING (true);

    DROP POLICY IF EXISTS "Service role manage publishers" ON public.publishers;
    CREATE POLICY "Service role manage publishers"
      ON public.publishers FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  `);

  console.log('Publishers table created successfully!');
  await client.end();
}

createPublishers().catch(e => console.error(e));
