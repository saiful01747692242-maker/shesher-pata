-- Add optional per-book SEO overrides and safe URL slug history.
-- Existing book rows are intentionally left untouched; new columns are nullable.

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS slug_history text[];

-- Existing live slugs were checked for duplicates before adding this constraint.
-- Keep non-empty current slugs unique; historical slugs are checked by the admin API.
CREATE UNIQUE INDEX IF NOT EXISTS books_slug_unique_idx
  ON public.books (slug)
  WHERE slug IS NOT NULL AND btrim(slug) <> '';
