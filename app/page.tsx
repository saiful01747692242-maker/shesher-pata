import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';

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

export default function HomePage() {
  return <HomePageClient />;
}
