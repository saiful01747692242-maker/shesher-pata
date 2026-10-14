import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ব্যবহারের শর্তাবলী — শেষের পাতা | Terms & Conditions',
  description: 'শেষের পাতা অনলাইন বইয়ের দোকানের ব্যবহারের শর্তাবলী, অর্ডার পলিসি ও ডেলিভারি নীতিমালা।',
  alternates: {
    canonical: 'https://shesherpata.com/terms',
  },
  openGraph: {
    title: 'ব্যবহারের শর্তাবলী — শেষের পাতা',
    description: 'শেষের পাতা অনলাইন বইয়ের দোকানের ব্যবহারের শর্তাবলী ও নীতিমালা।',
    url: 'https://shesherpata.com/terms',
    siteName: 'শেষের পাতা | Shesher Pata',
    images: [{ url: 'https://shesherpata.com/og-image.png', width: 1200, height: 630, alt: 'ব্যবহারের শর্তাবলী — শেষের পাতা' }],
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
