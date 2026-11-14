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
  title: 'শেষের পাতা | বাংলা বইয়ের অনলাইন বুকশপ',
  description: 'শেষের পাতা থেকে বাংলা উপন্যাস, গল্প ও জনপ্রিয় লেখকদের বই সাশ্রয়ী দামে অর্ডার করুন। সারাদেশে হোম ডেলিভারি ও ক্যাশ অন ডেলিভারি সুবিধা।',
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
  openGraph: {
    title: 'শেষের পাতা | বাংলা বইয়ের অনলাইন বুকশপ',
    description: 'শেষের পাতা থেকে বাংলা উপন্যাস, গল্প ও জনপ্রিয় লেখকদের বই সাশ্রয়ী দামে অর্ডার করুন। সারাদেশে হোম ডেলিভারি ও ক্যাশ অন ডেলিভারি সুবিধা।',
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
    title: 'শেষের পাতা | বাংলা বইয়ের অনলাইন বুকশপ',
    description: 'শেষের পাতা থেকে বাংলা উপন্যাস, গল্প ও জনপ্রিয় লেখকদের বই সাশ্রয়ী দামে অর্ডার করুন। সারাদেশে হোম ডেলিভারি ও ক্যাশ অন ডেলিভারি সুবিধা।',
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
      <body
        className="min-h-screen text-zinc-900 flex flex-col selection:bg-amber-400 selection:text-zinc-950 font-bengali"
        suppressHydrationWarning
      >
        <Script id="google-tag-manager" strategy="beforeInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-55RQL3GZ');`}
        </Script>
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
