const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    host: 'aws-0-ap-southeast-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.tbgtvrveyjuupqbcldya',
    password: 'sesherpata12@#',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  console.log('Connecting to PostgreSQL database...');
  await client.connect();
  console.log('Connected successfully!');

  // 1. ORDERS TABLE
  console.log('Creating orders table if not exists...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      user_id TEXT,
      address TEXT NOT NULL,
      district TEXT NOT NULL,
      thana TEXT,
      postal_code TEXT,
      delivery_option TEXT NOT NULL DEFAULT 'inside_dhaka',
      delivery_fee NUMERIC NOT NULL DEFAULT 60,
      payment_method TEXT NOT NULL DEFAULT 'cod',
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      subtotal NUMERIC NOT NULL DEFAULT 0,
      discount_amount NUMERIC NOT NULL DEFAULT 0,
      coupon_code TEXT,
      total NUMERIC NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      order_notes TEXT,
      steadfast_consignment_id TEXT,
      steadfast_tracking_code TEXT,
      steadfast_status TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
    CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
    CREATE POLICY "Public can insert orders"
      ON public.orders FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);

    DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
    CREATE POLICY "Users can view own orders"
      ON public.orders FOR SELECT
      TO authenticated
      USING (auth.uid()::text = user_id OR auth.jwt()->>'email' = customer_email);

    DROP POLICY IF EXISTS "Service role manage orders" ON public.orders;
    CREATE POLICY "Service role manage orders"
      ON public.orders FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  `);
  console.log('✓ Orders table ready.');

  // 2. REVIEWS TABLE
  console.log('Creating reviews table if not exists...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.reviews (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
      user_id TEXT,
      user_name TEXT NOT NULL,
      user_email TEXT,
      rating NUMERIC NOT NULL CHECK (rating >= 1 AND rating <= 5),
      review_text TEXT NOT NULL,
      order_id TEXT,
      is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      CONSTRAINT unique_user_book_review UNIQUE(book_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_book_id ON public.reviews(book_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

    ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public can read reviews" ON public.reviews;
    CREATE POLICY "Public can read reviews"
      ON public.reviews FOR SELECT
      TO anon, authenticated
      USING (true);

    DROP POLICY IF EXISTS "Authenticated users can insert review" ON public.reviews;
    CREATE POLICY "Authenticated users can insert review"
      ON public.reviews FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid()::text = user_id);

    DROP POLICY IF EXISTS "Authenticated users can update own review" ON public.reviews;
    CREATE POLICY "Authenticated users can update own review"
      ON public.reviews FOR UPDATE
      TO authenticated
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);

    DROP POLICY IF EXISTS "Service role manage reviews" ON public.reviews;
    CREATE POLICY "Service role manage reviews"
      ON public.reviews FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  `);
  console.log('✓ Reviews table ready.');

  // 3. Ensure books table has rating and review_count columns
  await client.query(`
    ALTER TABLE public.books ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0;
    ALTER TABLE public.books ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
  `);
  console.log('✓ Books rating & review_count verified.');

  await client.end();
  console.log('Migration finished successfully!');
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
