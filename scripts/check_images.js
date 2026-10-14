const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach((l) => {
  const i = l.indexOf('=');
  if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^"|"$/g, '');
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkImages() {
  const { data: books } = await sb.from('books').select('id, title, image, cover_image').limit(10);
  books?.forEach((b) => {
    console.log(`[${b.id}] "${b.title}":`);
    console.log('   image:', b.image);
    console.log('   cover_image:', b.cover_image);
  });
}

checkImages();
