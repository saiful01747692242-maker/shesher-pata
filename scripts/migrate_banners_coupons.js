const { Client } = require('pg');

async function runMigration() {
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

  const sql = `
  -- 1. BANNERS TABLE
  CREATE TABLE IF NOT EXISTS public.banners (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'homepage_hero',
      placement TEXT NOT NULL DEFAULT 'homepage_hero',
      badge TEXT DEFAULT '',
      badge_color TEXT DEFAULT '',
      title TEXT DEFAULT '',
      subtitle TEXT DEFAULT '',
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      mobile_image_url TEXT DEFAULT '',
      primary_button_text TEXT DEFAULT '',
      primary_button_url TEXT DEFAULT '',
      secondary_button_text TEXT DEFAULT '',
      secondary_button_url TEXT DEFAULT '',
      highlight_text TEXT DEFAULT '',
      theme TEXT DEFAULT 'cream',
      display_order INTEGER DEFAULT 1,
      is_active BOOLEAN DEFAULT true,
      starts_at TIMESTAMP WITH TIME ZONE NULL,
      ends_at TIMESTAMP WITH TIME ZONE NULL,
      target_url TEXT DEFAULT '',
      open_in_new_tab BOOLEAN DEFAULT false,
      alt_text TEXT DEFAULT '',
      design_config JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- Add columns if table already exists
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'homepage_hero';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS placement TEXT DEFAULT 'homepage_hero';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT '';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS badge_color TEXT DEFAULT '';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS subtitle TEXT DEFAULT '';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS mobile_image_url TEXT DEFAULT '';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS primary_button_text TEXT DEFAULT '';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS primary_button_url TEXT DEFAULT '';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS secondary_button_text TEXT DEFAULT '';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS secondary_button_url TEXT DEFAULT '';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS highlight_text TEXT DEFAULT '';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'cream';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 1;
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE NULL;
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP WITH TIME ZONE NULL;
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS target_url TEXT DEFAULT '';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS open_in_new_tab BOOLEAN DEFAULT false;
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS alt_text TEXT DEFAULT '';
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS design_config JSONB DEFAULT '{}'::jsonb;
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

  CREATE INDEX IF NOT EXISTS idx_banners_placement ON public.banners(placement);
  CREATE INDEX IF NOT EXISTS idx_banners_is_active ON public.banners(is_active);
  CREATE INDEX IF NOT EXISTS idx_banners_display_order ON public.banners(display_order);

  ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Public read access to active banners" ON public.banners;
  CREATE POLICY "Public read access to active banners"
      ON public.banners FOR SELECT
      TO anon, authenticated
      USING (is_active = true);

  DROP POLICY IF EXISTS "Service role full access to banners" ON public.banners;
  CREATE POLICY "Service role full access to banners"
      ON public.banners FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

  -- 2. COUPONS TABLE
  CREATE TABLE IF NOT EXISTS public.coupons (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      discount_type TEXT NOT NULL DEFAULT 'percentage',
      discount_value NUMERIC(10, 2) NOT NULL,
      minimum_order_amount NUMERIC(10, 2) DEFAULT 0,
      maximum_discount_amount NUMERIC(10, 2) NULL,
      usage_limit INTEGER NULL,
      used_count INTEGER DEFAULT 0,
      per_user_limit INTEGER NULL,
      starts_at TIMESTAMP WITH TIME ZONE NULL,
      expires_at TIMESTAMP WITH TIME ZONE NULL,
      description TEXT DEFAULT '',
      applicable_to TEXT DEFAULT 'all',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS code TEXT;
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percentage';
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10, 2) DEFAULT 0;
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS minimum_order_amount NUMERIC(10, 2) DEFAULT 0;
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS maximum_discount_amount NUMERIC(10, 2) NULL;
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS usage_limit INTEGER NULL;
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0;
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS per_user_limit INTEGER NULL;
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE NULL;
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE NULL;
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS applicable_to TEXT DEFAULT 'all';
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

  CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_upper ON public.coupons(UPPER(code));
  CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons(is_active);
  CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON public.coupons(expires_at);

  ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Public read access to active coupons" ON public.coupons;
  CREATE POLICY "Public read access to active coupons"
      ON public.coupons FOR SELECT
      TO anon, authenticated
      USING (is_active = true);

  DROP POLICY IF EXISTS "Service role full access to coupons" ON public.coupons;
  CREATE POLICY "Service role full access to coupons"
      ON public.coupons FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

  -- 3. SEED INITIAL BANNERS (Homepage Hero Slides & Existing Promotional Banners)
  INSERT INTO public.banners (
      id, name, type, placement, badge, badge_color, title, subtitle, description,
      highlight_text, primary_button_text, primary_button_url, secondary_button_text, secondary_button_url,
      theme, display_order, is_active, alt_text
  ) VALUES
  (
      'banner-hero-1',
      'Homepage Hero: ঝামেলা ছাড়া বই কিনুন',
      'homepage_hero',
      'homepage_hero',
      '★ বিশ্বস্ত অনলাইন বুকশপ',
      'bg-[#E5A913] text-zinc-950',
      'ঝামেলা ছাড়া বই কিনুন',
      'সর্বোচ্চ ছাড়ে, দ্রুত সময়ে!',
      'অনলাইন বইয়ের নির্ভরযোগ্য আঙিনা — রবীন্দ্রনাথ, হুমায়ূন আহমেদ, ফেলুদা থেকে সমকালীন বেস্টসেলার বই শতভাগ অরিজিনাল প্রিন্টে।',
      'হটলাইন: ০১৭০০-০০০০০০ / ০১৯০০-০০০০০০',
      'বইসমূহ ঘুরে দেখুন',
      'books',
      'এখনই অর্ডার করুন',
      'catalog',
      'cream',
      1,
      true,
      'শেষের পাতা অনলাইন বুকশপ'
  ),
  (
      'banner-hero-2',
      'Homepage Hero: বইয়ের পাতায় নতুন গল্প',
      'homepage_hero',
      'homepage_hero',
      '🎉 বইমেলা বিশেষ আয়োজন',
      'bg-[#D32F2F] text-white',
      'বইয়ের পাতায় নতুন গল্প',
      'ফ্ল্যাট ১০% অতিরিক্ত ছাড়!',
      'যেকোনো ৩টি বা তার বেশি বই অর্ডারে সারা দেশে ফ্রি হোম ডেলিভারি ও বিশেষ গিফট বুকমার্ক। কুপন কোড: SHESHER10 ব্যবহার করুন।',
      'কুপন কোড: SHESHER10 (সীমিত সময়ের জন্য)',
      'অফারের বই দেখুন',
      'offers',
      'কুপন ব্যবহার করুন',
      'cart',
      'amber',
      2,
      true,
      'বইমেলা বিশেষ ছাড় ব্যানার'
  ),
  (
      'banner-hero-3',
      'Homepage Hero: সেরা লেখকদের বই এক ঠিকানায়',
      'homepage_hero',
      'homepage_hero',
      '📚 নতুন ও জনপ্রিয় প্রকাশনা',
      'bg-[#1B1910] text-[#E5A913]',
      'সেরা লেখকদের বই এক ঠিকানায়',
      'হোম ডেলিভারি ও ক্যাশ অন ডেলিভারি',
      'উপন্যাস, থ্রিলার, সায়েন্স ফিকশন, কবিতা ও ইসলামিক সাহিত্যের বিশাল কালেকশন সরাসরি আপনার দরজায় দ্রুততম সময়ে পৌঁছে দিতে আমরা প্রস্তুত।',
      'সারা দেশে দ্রুততম হোম ডেলিভারি সুবিধা',
      'ক্যাটালগ ব্রাউজ করুন',
      'books',
      'বেস্টসেলার দেখুন',
      'bestsellers',
      'cream',
      3,
      true,
      'নতুন ও জনপ্রিয় প্রকাশনা ব্যানার'
  ),
  (
      'banner-promo-midpage',
      'Mid-Page Promo: বইমেলা বিশেষ কুপন',
      'homepage_promo',
      'homepage_promo',
      'বিশেষ সুযোগ',
      'bg-[#E5A913] text-zinc-950',
      'যেকোনো ৩টি বই কিনলেই সারা দেশে ফ্রি হোম ডেলিভারি!',
      'চেকআউটে কুপন কোড ব্যবহার করুন: SHESHER10',
      'যেকোনো ৩টি বা ততোধিক বইয়ের অর্ডারে পাচ্ছেন সারা দেশে ফ্রি হোম ডেলিভারি',
      '',
      'অফার উপভোগ করুন ➔',
      'books',
      '',
      '',
      'dark',
      1,
      true,
      'ফ্রি হোম ডেলিভারি কুপন ব্যানার'
  ),
  (
      'banner-ghibli',
      'Campaign: স্টুডিও জিবলি বিশেষ আর্ট কালেকশন',
      'campaign',
      'campaign',
      'Exclusive Drop',
      'bg-[#E5A913] text-zinc-950',
      'স্টুডিও জিবলি বিশেষ আর্ট ও স্টেশনারি কালেকশন',
      'নোটবুক, বুকমার্ক ও মেমোপ্যাড কালেকশন',
      'Studio Ghibli Inspired Stationery Collection',
      '',
      'কালেকশন দেখুন',
      'stationery',
      '',
      '',
      'cream',
      4,
      true,
      'স্টুডিও জিবলি বিশেষ আর্ট ব্যানার'
  ),
  (
      'banner-bestsellers',
      'Campaign: বিশ্বমানের ক্ল্যাসিক ও আন্তর্জাতিক সাহিত্য',
      'campaign',
      'campaign',
      'Bestseller Picks',
      'bg-[#E5A913] text-zinc-950',
      'বিশ্বমানের ক্ল্যাসিক ও সমকালীন আন্তর্জাতিক সাহিত্য',
      'হারুকি মুরাকামি, স্টিফেন কিং, ও বিশ্বসেরা বই',
      'Curated World Literature & Modern Fiction',
      '',
      'বইসমূহ দেখুন',
      'books',
      '',
      '',
      'cream',
      5,
      true,
      'আন্তর্জাতিক সাহিত্য কালেকশন'
  ),
  (
      'banner-fair',
      'Campaign: বইমেলা বিশেষ ছাড় — অতিরিক্ত ১০% ছাড়',
      'campaign',
      'campaign',
      'Special Offer',
      'bg-[#D32F2F] text-white',
      'বইমেলা বিশেষ ছাড় — অতিরিক্ত ১০% ছাড়',
      'কুপন কোড: SHESHER10 ব্যবহার করুন',
      'Spring Reading Carnival — Flat 10% Off',
      '',
      'অফার দেখুন',
      'offers',
      '',
      '',
      'amber',
      6,
      true,
      'বইমেলা বিশেষ অফার ব্যানার'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Update image URLs for ghibli, bestsellers, fair if missing
  UPDATE public.banners
  SET image_url = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1600&h=600&q=85'
  WHERE id = 'banner-ghibli' AND (image_url IS NULL OR image_url = '');

  UPDATE public.banners
  SET image_url = 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1600&h=600&q=85'
  WHERE id = 'banner-bestsellers' AND (image_url IS NULL OR image_url = '');

  UPDATE public.banners
  SET image_url = 'https://images.unsplash.com/photo-1507842229440-1926b0147983?auto=format&fit=crop&w=1600&h=600&q=85'
  WHERE id = 'banner-fair' AND (image_url IS NULL OR image_url = '');

  -- 4. SEED INITIAL COUPONS (SHESHER10, BOI10, BOIMELA20)
  INSERT INTO public.coupons (
      id, code, discount_type, discount_value, minimum_order_amount,
      maximum_discount_amount, usage_limit, used_count, description, is_active
  ) VALUES
  (
      'coupon-shesher10',
      'SHESHER10',
      'percentage',
      10.00,
      0.00,
      NULL,
      1000,
      0,
      'বইমেলা বিশেষ ছাড় — সকল বইয়ে অতিরিক্ত ১০% ছাড়',
      true
  ),
  (
      'coupon-boi10',
      'BOI10',
      'percentage',
      10.00,
      0.00,
      NULL,
      500,
      0,
      'বিশেষ ১০% স্পেশাল ছাড় কুপন',
      true
  ),
  (
      'coupon-boimela20',
      'BOIMELA20',
      'percentage',
      20.00,
      500.00,
      500.00,
      200,
      0,
      'বইমেলা বিশেষ ২০% কুপন ডিসকাউন্ট (সর্বনিম্ন ৫০০৳ অর্ডার)',
      true
  )
  ON CONFLICT (id) DO NOTHING;

  -- 5. RELOAD SCHEMA CACHE
  NOTIFY pgrst, 'reload schema';
  `;

  console.log('Running banners & coupons migration...');
  await client.query(sql);
  console.log('Migration completed successfully!');

  // Check counts
  const banRes = await client.query('SELECT count(*) FROM public.banners;');
  console.log('Banners total in DB:', banRes.rows[0].count);

  const coupRes = await client.query('SELECT count(*) FROM public.coupons;');
  console.log('Coupons total in DB:', coupRes.rows[0].count);

  const banList = await client.query('SELECT id, name, placement, is_active, display_order FROM public.banners ORDER BY display_order;');
  console.log('Banners list:', banList.rows);

  const coupList = await client.query('SELECT id, code, discount_type, discount_value, is_active FROM public.coupons;');
  console.log('Coupons list:', coupList.rows);

  await client.end();
}

runMigration().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
