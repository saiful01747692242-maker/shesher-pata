const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createOgImage() {
  const width = 1200;
  const height = 630;

  // 1. Prepare rounded logo
  const logoPath = path.join(__dirname, '..', 'public', 'images', 'logo.jpg');
  const roundedCorners = Buffer.from(
    '<svg><rect x="0" y="0" width="260" height="260" rx="44" ry="44"/></svg>'
  );

  const roundedLogo = await sharp(logoPath)
    .resize(260, 260, { fit: 'cover' })
    .composite([{ input: roundedCorners, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 2. SVG graphic layer
  const svgOverlay = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#14110E" />
          <stop offset="50%" stop-color="#1F1812" />
          <stop offset="100%" stop-color="#110E0C" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#F59E0B" />
          <stop offset="50%" stop-color="#FCD34D" />
          <stop offset="100%" stop-color="#D97706" />
        </linearGradient>
        <linearGradient id="logoBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F59E0B" />
          <stop offset="100%" stop-color="#78350F" />
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="${width}" height="${height}" fill="url(#bgGradient)" />

      <!-- Subtle background circles -->
      <circle cx="200" cy="200" r="280" fill="#D97706" opacity="0.08" />
      <circle cx="1000" cy="450" r="300" fill="#78350F" opacity="0.12" />

      <!-- Elegant Framing -->
      <rect x="25" y="25" width="1150" height="580" rx="28" fill="none" stroke="#78350F" stroke-width="2" stroke-opacity="0.35" />
      <rect x="35" y="35" width="1130" height="560" rx="20" fill="none" stroke="#D97706" stroke-width="1" stroke-opacity="0.15" />

      <!-- Logo Frame -->
      <rect x="95" y="165" width="270" height="270" rx="49" fill="none" stroke="url(#logoBorder)" stroke-width="3" />

      <!-- Pill Badge -->
      <rect x="420" y="145" width="290" height="42" rx="21" fill="#78350F" fill-opacity="0.35" stroke="#F59E0B" stroke-width="1.5" />
      <text x="565" y="172" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#FDE68A" text-anchor="middle">
        অনলাইন বইয়ের দোকান • BOOKSHOP
      </text>

      <!-- Main Bangla Brand -->
      <text x="420" y="260" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="76" font-weight="900" fill="#FFFFFF">
        শেষের পাতা
      </text>

      <!-- Subtitle -->
      <text x="420" y="325" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="url(#goldGrad)">
        Shesher Pata
      </text>

      <!-- Tagline -->
      <text x="420" y="380" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="23" font-weight="500" fill="#E5E7EB">
        আপনার পছন্দের প্রিয় বইয়ের নির্ভরযোগ্য অনলাইন ঠিকানা
      </text>

      <!-- Features Bar -->
      <g transform="translate(420, 430)">
        <rect x="0" y="0" width="210" height="48" rx="14" fill="#251E17" stroke="#443525" stroke-width="1.5" />
        <text x="105" y="31" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="17" fill="#E5E7EB" font-weight="600" text-anchor="middle">
          ✓ আসল ও মানসম্মত বই
        </text>

        <rect x="225" y="0" width="230" height="48" rx="14" fill="#251E17" stroke="#443525" stroke-width="1.5" />
        <text x="340" y="31" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="17" fill="#E5E7EB" font-weight="600" text-anchor="middle">
          ✓ সারাদেশে ক্যাশ অন ডেলিভারি
        </text>

        <rect x="470" y="0" width="180" height="48" rx="14" fill="#251E17" stroke="#443525" stroke-width="1.5" />
        <text x="560" y="31" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="17" fill="#FDE68A" font-weight="600" text-anchor="middle">
          ★ সেরা অফার ও ছাড়
        </text>
      </g>

      <!-- Footer Domain URL -->
      <g transform="translate(420, 530)">
        <text x="0" y="0" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#9CA3AF">
          https://shesherpata.com
        </text>
      </g>
    </svg>
  `);

  const outputPath = path.join(__dirname, '..', 'public', 'og-image.png');

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 20, g: 17, b: 14, alpha: 1 },
    },
  })
    .composite([
      { input: svgOverlay, top: 0, left: 0 },
      { input: roundedLogo, top: 170, left: 100 },
    ])
    .png({ quality: 95, compressionLevel: 8 })
    .toFile(outputPath);

  console.log('Successfully created:', outputPath);
}

createOgImage().catch((err) => {
  console.error('Failed to create OG image:', err);
  process.exit(1);
});
