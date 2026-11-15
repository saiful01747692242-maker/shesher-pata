import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';
import { getPublicBooks, getPublicSiteSettings } from '../src/lib/serverPublicData';

const description = 'শেষের পাতা থেকে বাংলা উপন্যাস, গল্প ও জনপ্রিয় লেখকদের বই সাশ্রয়ী দামে অর্ডার করুন। সারাদেশে হোম ডেলিভারি ও ক্যাশ অন ডেলিভারি সুবিধা।';

export const metadata: Metadata = {
  title: 'শেষের পাতা | বাংলা বইয়ের অনলাইন বুকশপ',
  description,
  alternates: {
    canonical: 'https://shesherpata.com/',
  },
  openGraph: {
    title: 'শেষের পাতা | বাংলা বইয়ের অনলাইন বুকশপ',
    description,
    url: 'https://shesherpata.com/',
    siteName: 'শেষের পাতা | Shesher Pata',
    locale: 'bn_BD',
    type: 'website',
    images: [{
      url: 'https://shesherpata.com/og-image.png',
      width: 1200,
      height: 630,
      alt: 'শেষের পাতা — বাংলা বইয়ের অনলাইন বুকশপ',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'শেষের পাতা | বাংলা বইয়ের অনলাইন বুকশপ',
    description,
    images: ['https://shesherpata.com/og-image.png'],
  },
};

const SITE_URL = 'https://shesherpata.com';

/** Convert a Bangladeshi local number (01XXXXXXXXX) to international format for structured data. */
function toInternationalPhone(raw?: string): string | undefined {
  const digits = String(raw || '').replace(/\D/g, '');
  if (/^01\d{9}$/.test(digits)) return `+88${digits}`;
  if (/^8801\d{9}$/.test(digits)) return `+${digits}`;
  return undefined;
}

export default async function HomePage() {
  const [books, settings] = await Promise.all([getPublicBooks(), getPublicSiteSettings()]);

  const sameAs = [settings?.facebook_url, settings?.instagram_url].filter(
    (url): url is string => Boolean(url) && /^https:\/\/(www\.)?(facebook|instagram)\.com\/.+/i.test(url as string)
  );
  const telephone = toInternationalPhone(settings?.phone);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['BookStore', 'Organization'],
        '@id': `${SITE_URL}/#organization`,
        name: 'শেষের পাতা',
        alternateName: 'Shesher Pata',
        url: SITE_URL,
        logo: `${SITE_URL}/images/logo.jpg`,
        image: `${SITE_URL}/og-image.png`,
        description,
        telephone,
        address: settings?.address
          ? {
              '@type': 'PostalAddress',
              streetAddress: settings.address,
              addressLocality: 'ঢাকা',
              addressCountry: 'BD',
            }
          : undefined,
        sameAs: sameAs.length > 0 ? sameAs : undefined,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'শেষের পাতা | Shesher Pata',
        inLanguage: 'bn-BD',
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <HomePageClient initialBooks={books} />
    </>
  );
}
