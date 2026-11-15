-- SEO data clean-up for shesherpata.com
-- Review each block, then run it in the Supabase SQL editor. Nothing here has been applied yet.

-- 1) "দেবী" (sp-book-28): description_bn holds the English text of an unrelated book,
--    and Google shows it as the search snippet. The correct Bengali text is in `description`.
update public.books
set description_bn = description,
    updated_at = now()
where id = 'sp-book-28'
  and description_bn ilike '%insignificant ape%';

-- 2) Made-up review counters: the reviews table has no rows, yet books show 1 to 410 reviews.
--    Reset the counters for every book that has no real review. Ratings are left untouched
--    because the homepage uses them to pick featured books.
update public.books b
set review_count = 0
where not exists (select 1 from public.reviews r where r.book_id = b.id)
  and coalesce(b.review_count, 0) > 0;

-- 3) Possible duplicate listings. Decide which one to keep, then hide the other one.
--    Hiding (is_active = false) removes it from the sitemap and the shop; it does not delete it.
--
--    "সুচরিতা" (same author, same price): suchrita-8  and  suchrita-1792215382827-687
--    "তোমাতেই আসক্ত" (same author, same price): tomatei-askt-31  and  tomatei-askt-1791560004218-719
--
-- update public.books set is_active = false, updated_at = now() where slug = 'suchrita-8';
-- update public.books set is_active = false, updated_at = now() where slug = 'tomatei-askt-1791560004218-719';
--
-- The other pairs with similar names are different editions or volumes
-- (যাত্রাপথ / যাত্রাপথ ২য় খণ্ড, নির্মোচন / হার্ডকভার, রিদ মায়ার প্রেমগাঁথা ১ ও ২) and should stay.
