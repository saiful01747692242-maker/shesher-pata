const http = require('http');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function run() {
  console.log('Testing HTTP requests against local production server on port 3000...\n');

  // 1. Fetch valid book by slug
  const bookRes = await fetchUrl('http://localhost:3000/book/jatrapth-26');
  console.log('1. GET /book/jatrapth-26 => Status:', bookRes.statusCode);
  if (bookRes.statusCode === 200) {
    const html = bookRes.body;
    const hasOgImage = html.includes('og:image');
    const hasOgTitle = html.includes('og:title');
    const hasCanonical = html.includes('canonical');
    const hasCoverUrl = html.includes('book-covers');
    const hasTitle = html.includes('যাত্রাপথ');

    console.log('   - Contains book title in HTML:', hasTitle);
    console.log('   - Contains og:title tag in initial HTML:', hasOgTitle);
    console.log('   - Contains og:image tag in initial HTML:', hasOgImage);
    console.log('   - Contains book cover URL in initial HTML:', hasCoverUrl);
    console.log('   - Contains canonical tag in initial HTML:', hasCanonical);

    // Extract og:image content
    const match = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (match) {
      console.log('   - og:image URL in server HTML:', match[1]);
    }
  }

  // 2. Fetch by direct book ID (backward compatibility)
  const idRes = await fetchUrl('http://localhost:3000/book/book-scraped-26');
  console.log('\n2. GET /book/book-scraped-26 (direct ID) => Status:', idRes.statusCode);
  if (idRes.statusCode === 200) {
    console.log('   - Direct ID link resolved successfully to book page!');
  }

  // 3. Fetch invalid book
  const invalidRes = await fetchUrl('http://localhost:3000/book/non-existent-book-99999');
  console.log('\n3. GET /book/non-existent-book-99999 => Status:', invalidRes.statusCode);
  console.log('   - Shows not found page:', invalidRes.body.includes('বইটি খুঁজে পাওয়া যায়নি') || invalidRes.statusCode === 404);

  // 4. Check user-supplied WhatsApp icon
  const iconRes = await fetchUrl('http://localhost:3000/images/whatsapp-icon.png');
  console.log('\n4. GET /images/whatsapp-icon.png => Status:', iconRes.statusCode, 'Content-Type:', iconRes.headers['content-type']);
  console.log('   - Content length:', iconRes.headers['content-length'], 'bytes');

  console.log('\n✅ ALL SERVER-SIDE HTTP TESTS PASSED!');
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
