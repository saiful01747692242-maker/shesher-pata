-- ==============================================================================
-- শেষের পাতা (Sesher Pata) — Complete & Final Supabase SQL Migration
-- ==============================================================================
-- Run this in your Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run
-- 
-- Safe, non-destructive, and 100% idempotent:
-- 1. Creates/Updates `public.books` table without dropping any existing data.
-- 2. Creates/Updates `public.profiles` table with foreign key to `auth.users(id)`.
-- 3. Creates/Updates `public.site_settings` table and seeds default store configuration.
-- 4. Establishes secure Row Level Security (RLS) policies for books, profiles, and settings.
-- 5. Configures Supabase Realtime publication for multi-client book synchronization.
-- 6. Configures Supabase Storage buckets (book-covers, book-banners, book-files) & policies.
-- 7. Configures automated PostgreSQL triggers for updated_at timestamps & user signups.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BOOKS TABLE & PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.books (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    title_bn TEXT,
    bangla_name TEXT,
    english_name TEXT,
    author TEXT,
    publisher TEXT DEFAULT 'বাতিঘর',
    category TEXT DEFAULT 'উপন্যাস',
    description TEXT DEFAULT '',
    description_bn TEXT DEFAULT '',
    image TEXT DEFAULT '',
    cover_image TEXT DEFAULT '',
    banner_image TEXT DEFAULT '',
    pdf_url TEXT DEFAULT '',
    gallery JSONB DEFAULT '[]'::jsonb,
    price NUMERIC NOT NULL DEFAULT 0,
    original_price NUMERIC DEFAULT 0,
    old_price NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    rating NUMERIC DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    isbn TEXT DEFAULT '',
    pages INTEGER DEFAULT 0,
    edition TEXT DEFAULT '১ম সংস্করণ',
    language TEXT DEFAULT 'বাংলা',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_bestseller BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT false,
    is_new_release BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    is_international BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'published',
    section_ids TEXT[] DEFAULT ARRAY['new-arrivals']::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all required columns exist safely if table already existed prior to migration
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS title_bn TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS bangla_name TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS english_name TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS author TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS publisher TEXT DEFAULT 'বাতিঘর';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'উপন্যাস';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS description_bn TEXT DEFAULT '';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS image TEXT DEFAULT '';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS cover_image TEXT DEFAULT '';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS banner_image TEXT DEFAULT '';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS pdf_url TEXT DEFAULT '';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS original_price NUMERIC DEFAULT 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS old_price NUMERIC DEFAULT 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS isbn TEXT DEFAULT '';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS pages INTEGER DEFAULT 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS edition TEXT DEFAULT '১ম সংস্করণ';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'বাংলা';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_bestseller BOOLEAN DEFAULT false;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_new_release BOOLEAN DEFAULT false;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS section_ids TEXT[] DEFAULT ARRAY['new-arrivals']::TEXT[];
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Performance Indexes for books catalog filtering and sorting
CREATE INDEX IF NOT EXISTS idx_books_slug ON public.books(slug);
CREATE INDEX IF NOT EXISTS idx_books_category ON public.books(category);
CREATE INDEX IF NOT EXISTS idx_books_status ON public.books(status);
CREATE INDEX IF NOT EXISTS idx_books_is_active ON public.books(is_active);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON public.books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_price ON public.books(price);
CREATE INDEX IF NOT EXISTS idx_books_featured ON public.books(is_featured);
CREATE INDEX IF NOT EXISTS idx_books_bestseller ON public.books(is_bestseller);

-- Automatic updated_at trigger for books
CREATE OR REPLACE FUNCTION public.update_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_books_updated_at ON public.books;
CREATE TRIGGER trigger_books_updated_at
    BEFORE UPDATE ON public.books
    FOR EACH ROW
    EXECUTE FUNCTION public.update_books_updated_at();

-- ------------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) FOR BOOKS
-- ------------------------------------------------------------------------------

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Public users (anonymous visitors and customers) can read published active books
DROP POLICY IF EXISTS "Allow public read access to books" ON public.books;
CREATE POLICY "Allow public read access to books"
    ON public.books
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true OR is_active IS NULL);

-- Service role has full control for backend admin operations (Add/Edit/Delete)
DROP POLICY IF EXISTS "Allow service_role full access to books" ON public.books;
CREATE POLICY "Allow service_role full access to books"
    ON public.books
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. SUPABASE REALTIME CONFIGURATION FOR BOOKS
-- ------------------------------------------------------------------------------

-- Ensure full row representation is provided on UPDATE and DELETE payloads
ALTER TABLE public.books REPLICA IDENTITY FULL;

-- Register public.books table into the supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'books'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.books;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. USER PROFILES TABLE & SIGNUP TRIGGER
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all profile columns exist safely
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Performance index for profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view ONLY their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Policy: Authenticated users can update ONLY their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: Authenticated users can insert their own profile record if missing
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Policy: Service role has administrative access for backend management
DROP POLICY IF EXISTS "Service role manage profiles" ON public.profiles;
CREATE POLICY "Service role manage profiles"
    ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Automatic updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_profiles_updated_at();

-- Secure trigger function to automatically populate public.profiles upon auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        name = CASE 
            WHEN EXCLUDED.name IS NOT NULL AND EXCLUDED.name <> '' THEN EXCLUDED.name 
            ELSE public.profiles.name 
        END,
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 5. SITE SETTINGS TABLE (STORE CONFIGURATION)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.site_settings (
    id TEXT PRIMARY KEY DEFAULT 'default_settings',
    meta_pixel_id TEXT DEFAULT '',
    meta_pixel_enabled BOOLEAN DEFAULT FALSE,
    phone TEXT DEFAULT '০১৭০০-০০০০০০',
    alt_phone TEXT DEFAULT '০১৯০০-০০০০০০',
    email TEXT DEFAULT 'support@shesherpata.com',
    address TEXT DEFAULT 'কাঁটাবন বইয়ের মার্কেট, নিউ এলিফ্যান্ট রোড, ঢাকা-১২০৫',
    support_hours TEXT DEFAULT 'প্রতিদিন সকাল ৯টা হতে রাত ১০টা পর্যন্ত',
    announcement_badge TEXT DEFAULT 'অফার',
    announcement_text TEXT DEFAULT 'বইমেলা বিশেষ ছাড় — SHESHER10 কুপনে অতিরিক্ত ১০% ছাড়!',
    about_text TEXT DEFAULT '"শেষের পাতা" কেবল একটি অনলাইন বইয়ের দোকান নয়, এটি প্রতিটি বইপ্রেমীর মনের একটি শান্তির আঙিনা। আমরা বিশ্বাস করি একটি ভালো বই একজন মানুষের জীবন বদলে দিতে পারে।',
    facebook_url TEXT DEFAULT 'https://facebook.com',
    instagram_url TEXT DEFAULT 'https://instagram.com',
    whatsapp_number TEXT DEFAULT '',
    steadfast_enabled BOOLEAN DEFAULT FALSE,
    delivery_charge_inside NUMERIC DEFAULT 60,
    delivery_charge_outside NUMERIC DEFAULT 120,
    free_delivery_threshold NUMERIC DEFAULT 1500,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure newly added settings columns exist safely
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '০১৭০০-০০০০০০';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS alt_phone TEXT DEFAULT '০১৯০০-০০০০০০';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS email TEXT DEFAULT 'support@shesherpata.com';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS address TEXT DEFAULT 'কাঁটাবন বইয়ের মার্কেট, নিউ এলিফ্যান্ট রোড, ঢাকা-১২০৫';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS support_hours TEXT DEFAULT 'প্রতিদিন সকাল ৯টা হতে রাত ১০টা পর্যন্ত';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS announcement_badge TEXT DEFAULT 'অফার';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS announcement_text TEXT DEFAULT 'বইমেলা বিশেষ ছাড় — SHESHER10 কুপনে অতিরিক্ত ১০% ছাড়!';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS about_text TEXT DEFAULT '"শেষের পাতা" কেবল একটি অনলাইন বইয়ের দোকান নয়, এটি প্রতিটি বইপ্রেমীর মনের একটি শান্তির আঙিনা। আমরা বিশ্বাস করি একটি ভালো বই একজন মানুষের জীবন বদলে দিতে পারে।';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS facebook_url TEXT DEFAULT 'https://facebook.com';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT 'https://instagram.com';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS steadfast_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS delivery_charge_inside NUMERIC DEFAULT 60;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS delivery_charge_outside NUMERIC DEFAULT 120;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS free_delivery_threshold NUMERIC DEFAULT 1500;

-- Insert initial default settings row if it doesn't exist
INSERT INTO public.site_settings (
    id, meta_pixel_id, meta_pixel_enabled,
    phone, alt_phone, email, address, support_hours,
    announcement_badge, announcement_text, about_text,
    facebook_url, instagram_url, whatsapp_number,
    updated_at
)
VALUES (
    'default_settings', '', false,
    '০১৭০০-০০০০০০', '০১৯০০-০০০০০০', 'support@shesherpata.com',
    'কাঁটাবন বইয়ের মার্কেট, নিউ এলিফ্যান্ট রোড, ঢাকা-১২০৫', 'প্রতিদিন সকাল ৯টা হতে রাত ১০টা পর্যন্ত',
    'অফার', 'বইমেলা বিশেষ ছাড় — SHESHER10 কুপনে অতিরিক্ত ১০% ছাড়!',
    '"শেষের পাতা" কেবল একটি অনলাইন বইয়ের দোকান নয়, এটি প্রতিটি বইপ্রেমীর মনের একটি শান্তির আঙিনা। আমরা বিশ্বাস করি একটি ভালো বই একজন মানুষের জীবন বদলে দিতে পারে।',
    'https://facebook.com', 'https://instagram.com', '',
    timezone('utc'::text, now())
)
ON CONFLICT (id) DO NOTHING;

-- Site settings RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to site_settings" ON public.site_settings;
CREATE POLICY "Allow public read access to site_settings"
    ON public.site_settings
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to site_settings" ON public.site_settings;
CREATE POLICY "Allow service_role full access to site_settings"
    ON public.site_settings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Automatic updated_at trigger for site_settings
CREATE OR REPLACE FUNCTION public.update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER trigger_site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_site_settings_updated_at();

-- ------------------------------------------------------------------------------
-- 5.1. STEADFAST COURIER ENCRYPTED CONFIGURATION (steadfast_config)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.steadfast_config (
    id TEXT PRIMARY KEY DEFAULT 'primary',
    api_key_encrypted TEXT NOT NULL DEFAULT '',
    secret_key_encrypted TEXT NOT NULL DEFAULT '',
    is_connected BOOLEAN NOT NULL DEFAULT false,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security: Completely blocked from public clients
ALTER TABLE public.steadfast_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service_role full access to steadfast_config" ON public.steadfast_config;
CREATE POLICY "Allow service_role full access to steadfast_config"
    ON public.steadfast_config
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Automatic updated_at trigger for steadfast_config
DROP TRIGGER IF EXISTS trigger_steadfast_config_updated_at ON public.steadfast_config;
CREATE TRIGGER trigger_steadfast_config_updated_at
    BEFORE UPDATE ON public.steadfast_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_site_settings_updated_at();

-- ------------------------------------------------------------------------------
-- 6. SUPABASE STORAGE BUCKETS (book-covers, book-banners, book-files)
-- ------------------------------------------------------------------------------

-- Public bucket for book cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public bucket for promotional banner images
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-banners', 'book-banners', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Private bucket for downloadable book files or preview PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-files', 'book-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies: Public read access for cover images and banners
DROP POLICY IF EXISTS "Public read access for book-covers" ON storage.objects;
CREATE POLICY "Public read access for book-covers"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'book-covers');

DROP POLICY IF EXISTS "Public read access for book-banners" ON storage.objects;
CREATE POLICY "Public read access for book-banners"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'book-banners');

-- Storage Policies: Service role has full control for uploads and deletions
DROP POLICY IF EXISTS "Service role manage book-covers" ON storage.objects;
CREATE POLICY "Service role manage book-covers"
    ON storage.objects FOR ALL
    TO service_role
    USING (bucket_id = 'book-covers')
    WITH CHECK (bucket_id = 'book-covers');

DROP POLICY IF EXISTS "Service role manage book-banners" ON storage.objects;
CREATE POLICY "Service role manage book-banners"
    ON storage.objects FOR ALL
    TO service_role
    USING (bucket_id = 'book-banners')
    WITH CHECK (bucket_id = 'book-banners');

DROP POLICY IF EXISTS "Service role manage book-files" ON storage.objects;
CREATE POLICY "Service role manage book-files"
    ON storage.objects FOR ALL
    TO service_role
    USING (bucket_id = 'book-files')
    WITH CHECK (bucket_id = 'book-files');

-- ------------------------------------------------------------------------------
-- 7. CATEGORIES TABLE
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    english_name TEXT DEFAULT '',
    icon_name TEXT DEFAULT 'BookOpen',
    image TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    book_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist safely
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS english_name TEXT DEFAULT '';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon_name TEXT DEFAULT 'BookOpen';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image TEXT DEFAULT '';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS book_count INTEGER DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories;
CREATE POLICY "Allow public read access to categories"
    ON public.categories FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to categories" ON public.categories;
CREATE POLICY "Allow service_role full access to categories"
    ON public.categories FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Realtime for categories
ALTER TABLE public.categories REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  END IF;
END $$;

-- Automatic updated_at trigger for categories
DROP TRIGGER IF EXISTS trigger_categories_updated_at ON public.categories;
CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_books_updated_at();

-- Seed initial categories
INSERT INTO public.categories (id, name, english_name, icon_name, image, image_url, book_count)
VALUES
    ('novel', 'উপন্যাস', 'Novels', 'BookOpen', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80', 420),
    ('thriller', 'থ্রিলার ও রহস্য', 'Thriller & Mystery', 'Search', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80', 310),
    ('islamic', 'ইসলামিক সাহিত্য', 'Islamic Literature', 'Moon', 'https://images.unsplash.com/photo-1584286595398-a59f21d313f5?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1584286595398-a59f21d313f5?auto=format&fit=crop&w=400&q=80', 380),
    ('children', 'শিশু-কিশোর', 'Children & Teens', 'Smile', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80', 290),
    ('poetry', 'কবিতা', 'Poetry', 'BookMarked', 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=400&q=80', 195),
    ('story', 'গল্প ও সাহিত্য', 'Short Stories', 'Feather', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80', 260),
    ('self-help', 'আত্মউন্নয়ন', 'Self Help & Motivation', 'TrendingUp', 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=400&q=80', 210),
    ('history', 'ইতিহাস ও ঐতিহ্য', 'History & Culture', 'Landmark', 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=400&q=80', 240),
    ('scifi', 'সায়েন্স ফিকশন', 'Sci-Fi & Fantasy', 'Atom', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80', 180),
    ('english', 'ইংরেজি ও অনুবাদ', 'English & Translations', 'Languages', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=400&q=80', 350),
    ('academic', 'একাডেমিক ও ক্যারিয়ার', 'Academic & Career', 'GraduationCap', 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80', 520),
    ('package', 'স্পেশাল প্যাকেজ', 'Special Bundles', 'Package', 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=400&q=80', 85)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 8. AUTHORS TABLE
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.authors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    era TEXT DEFAULT '',
    role TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    image TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    book_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist safely
ALTER TABLE public.authors ADD COLUMN IF NOT EXISTS era TEXT DEFAULT '';
ALTER TABLE public.authors ADD COLUMN IF NOT EXISTS role TEXT DEFAULT '';
ALTER TABLE public.authors ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE public.authors ADD COLUMN IF NOT EXISTS image TEXT DEFAULT '';
ALTER TABLE public.authors ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE public.authors ADD COLUMN IF NOT EXISTS book_count INTEGER DEFAULT 0;
ALTER TABLE public.authors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to authors" ON public.authors;
CREATE POLICY "Allow public read access to authors"
    ON public.authors FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to authors" ON public.authors;
CREATE POLICY "Allow service_role full access to authors"
    ON public.authors FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Realtime for authors
ALTER TABLE public.authors REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'authors'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.authors;
  END IF;
END $$;

-- Automatic updated_at trigger for authors
DROP TRIGGER IF EXISTS trigger_authors_updated_at ON public.authors;
CREATE TRIGGER trigger_authors_updated_at
    BEFORE UPDATE ON public.authors
    FOR EACH ROW
    EXECUTE FUNCTION public.update_books_updated_at();

-- Seed initial authors
INSERT INTO public.authors (id, name, era, role, bio, image, image_url, book_count)
VALUES
    ('author-humayun', 'হুমায়ূন আহমেদ', '১৯৪৮ – ২০১২', 'কথাসাহিত্যিক, নাট্যকার ও চলচ্চিত্র নির্মাতা', 'আধুনিক বাংলা সাহিত্যের সবচেয়ে জনপ্রিয় কথাসাহিত্যিক। মিসির আলি, হিমু ও শুভ্র চরিত্রের স্রষ্টা।', 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80', 45),
    ('author-rabindranath', 'রবীন্দ্রনাথ ঠাকুর', '১৮৬১ – ১৯৪১', 'বিশ্বকবি, নোবেল বিজয়ী সাহিত্যিক', 'বাংলা ভাষা ও সাহিত্যের রূপকার। গীতাঞ্জলি কাব্যের জন্য ১৯১৩ সালে এশিয়ার প্রথম নোবেল পুরস্কার লাভ করেন।', 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=400&q=80', 38),
    ('author-nazrul', 'কাজী নজরুল ইসলাম', '১৮৯৯ – ১৯৭৬', 'জাতীয় কবি, বিদ্রোহী কবি ও সুরস্রষ্টা', 'বাংলা সাহিত্যের অন্যতম শ্রেষ্ঠ কবি, দ্রোহ, সাম্য ও প্রেমের অবিসংবাদিত কণ্ঠস্বর।', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80', 29),
    ('author-satyajit', 'সত্যজিৎ রায়', '১৯২১ – ১৯৯২', 'চলচ্চিত্রকার, লেখক ও চিত্রশিল্পী', 'অস্কারজয়ী চলচ্চিত্রকার এবং বাংলা সাহিত্যের জনপ্রিয় গোয়েন্দা চরিত্র ফেলুদা ও প্রফেসর শঙ্কুর অমর স্রষ্টা।', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80', 22),
    ('author-sunil', 'সুনীল গঙ্গোপাধ্যায়', '১৯৩৪ – ২০১২', 'কবি, ঔপন্যাসিক ও ছোটগল্পকার', 'নীললোহিত ছদ্মনামে খ্যাত। সেই সময়, প্রথম আলো, পূর্ব-পশ্চিম এবং কাকাবাবু সিরিজের অমর স্রষ্টা।', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', 34),
    ('author-sharat', 'শরৎচন্দ্র চট্টোপাধ্যায়', '১৮৭৬ – ১৯৩৮', 'অপরাজেয় কথাশিল্পী', 'বাংলা সাহিত্যের শ্রেষ্ঠ জীবনশিল্পী। চরিত্রহীন, দেবদাস, শ্রীকান্ত ও দেনা-পাওনা উপন্যাসের স্রষ্টা।', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', 26)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 9. PUBLISHERS TABLE (প্রকাশনী)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.publishers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    location TEXT DEFAULT 'ঢাকা',
    established TEXT DEFAULT '',
    logo TEXT DEFAULT '',
    book_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist safely
ALTER TABLE public.publishers ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.publishers ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'ঢাকা';
ALTER TABLE public.publishers ADD COLUMN IF NOT EXISTS established TEXT DEFAULT '';
ALTER TABLE public.publishers ADD COLUMN IF NOT EXISTS logo TEXT DEFAULT '';
ALTER TABLE public.publishers ADD COLUMN IF NOT EXISTS book_count INTEGER DEFAULT 0;
ALTER TABLE public.publishers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_publishers_name ON public.publishers(name);

ALTER TABLE public.publishers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to publishers" ON public.publishers;
CREATE POLICY "Allow public read access to publishers"
    ON public.publishers FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to publishers" ON public.publishers;
CREATE POLICY "Allow service_role full access to publishers"
    ON public.publishers FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Realtime publication for publishers
ALTER TABLE public.publishers REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'publishers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.publishers;
  END IF;
END $$;

-- Automatic updated_at trigger for publishers
DROP TRIGGER IF EXISTS trigger_publishers_updated_at ON public.publishers;
CREATE TRIGGER trigger_publishers_updated_at
    BEFORE UPDATE ON public.publishers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_books_updated_at();

-- ============================================================================
-- 11. BANNERS TABLE & POLICIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.banners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'homepage_hero',
    placement TEXT NOT NULL DEFAULT 'homepage_hero',
    badge TEXT,
    badge_color TEXT,
    title TEXT,
    subtitle TEXT,
    description TEXT,
    image_url TEXT NOT NULL,
    mobile_image_url TEXT,
    primary_button_text TEXT,
    primary_button_url TEXT,
    secondary_button_text TEXT,
    secondary_button_url TEXT,
    highlight_text TEXT,
    theme TEXT,
    theme_color TEXT,
    background_pattern TEXT,
    display_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    target_url TEXT DEFAULT '',
    open_in_new_tab BOOLEAN DEFAULT false,
    alt_text TEXT DEFAULT '',
    design_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS badge_color TEXT;
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS highlight_text TEXT;
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS target_url TEXT DEFAULT '';
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS open_in_new_tab BOOLEAN DEFAULT false;
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS design_config JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_banners_placement ON public.banners(placement);
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON public.banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banners_display_order ON public.banners(display_order);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active banners" ON public.banners;
CREATE POLICY "Public can view active banners"
    ON public.banners FOR SELECT
    TO anon, authenticated
    USING (
        is_active = true 
        AND (starts_at IS NULL OR starts_at <= timezone('utc'::text, now()))
        AND (ends_at IS NULL OR ends_at >= timezone('utc'::text, now()))
    );

DROP POLICY IF EXISTS "Service role manage banners" ON public.banners;
CREATE POLICY "Service role manage banners"
    ON public.banners FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- 12. COUPONS TABLE & POLICIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coupons (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL DEFAULT 'percentage',
    discount_value NUMERIC NOT NULL,
    minimum_order_amount NUMERIC DEFAULT 0,
    maximum_discount_amount NUMERIC,
    usage_limit INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    per_user_limit INTEGER DEFAULT 1,
    starts_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    description TEXT,
    applicable_to TEXT NOT NULL DEFAULT 'all',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON public.coupons(expires_at);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
CREATE POLICY "Public can view active coupons"
    ON public.coupons FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "Service role manage coupons" ON public.coupons;
CREATE POLICY "Service role manage coupons"
    ON public.coupons FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- 13. ORDERS TABLE & POLICIES
-- ============================================================================
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

-- ============================================================================
-- 14. REVIEWS TABLE & POLICIES
-- ============================================================================
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

