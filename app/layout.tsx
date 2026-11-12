import type { Metadata } from 'next';
import Script from 'next/script';
import { Noto_Sans_Bengali } from 'next/font/google';
import './globals.css';
import { AppProviders } from '../src/context/AppProviders';
import { WhatsAppFloatingButton } from '../src/components/WhatsAppFloatingButton';

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-noto-sans-bengali',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://shesherpata.com'),
  title: 'শেষের পাতা — অনলাইন বইয়ের দোকান | Shesher Pata Online Bookshop',
  description: 'শেষের পাতা - বাংলাদেশের সর্বাধিক বিশ্বস্ত অনলাইন বইয়ের দোকান। রবীন্দ্রনাথ, নজরুল, হুমায়ূন আহমেদ, ফেলুদা সহ সকল সেরা লেখকের ক্লাসিক ও নতুন বই কিনুন সেরা অফারে।',
  keywords: [
    'শেষের পাতা',
    'Shesher Pata',
    'অনলাইন বইয়ের দোকান',
    'বই কিনুন',
    'বাংলা বই',
    'রবীন্দ্রনাথ ঠাকুর',
    'হুমায়ূন আহমেদ',
    'ফেলুদা',
    'বইমেলা অফার',
    'Bangla Books Online',
  ],
  authors: [{ name: 'Shesher Pata' }],
  creator: 'Shesher Pata Team',
  alternates: {
    canonical: 'https://shesherpata.com',
  },
  openGraph: {
    title: 'শেষের পাতা — আপনার পছন্দের সেরা বাংলা বইয়ের সংগ্রহ',
    description: 'দেশি-বিদেশি অমর সাহিত্যকর্ম ও সাম্প্রতিক প্রকাশনা সরাসরি আপনার ঠিকানায়। হোম ডেলিভারি ও ক্যাশ অন ডেলিভারি সুবিধা!',
    url: 'https://shesherpata.com',
    siteName: 'শেষের পাতা | Shesher Pata',
    images: [
      {
        url: 'https://shesherpata.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'শেষের পাতা — অনলাইন বইয়ের দোকান | Shesher Pata',
        type: 'image/png',
      },
    ],
    locale: 'bn_BD',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'শেষের পাতা — অনলাইন বইয়ের দোকান',
    description: 'শতভাগ আসল ও মানসম্মত বাংলা বই কিনুন আকর্ষণীয় ছাড়ে। সারাদেশে ক্যাশ অন ডেলিভারি!',
    images: ['https://shesherpata.com/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" className={notoSansBengali.variable} suppressHydrationWarning>
      <head>
        {/* Google Tag Manager */}
        <Script id="google-tag-manager" strategy="beforeInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;
          j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
          f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-55RQL3GZ');`}
        </Script>
      </head>
      <body
        className="min-h-screen text-zinc-900 flex flex-col selection:bg-amber-400 selection:text-zinc-950 font-bengali"
        suppressHydrationWarning
      >
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-55RQL3GZ"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>
        <AppProviders>
          {children}
          <WhatsAppFloatingButton />
        </AppProviders>
      </body>
    </html>
  );
}
