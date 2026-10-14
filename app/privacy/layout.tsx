import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'গোপনীয়তা নীতি — শেষের পাতা | Privacy Policy',
  description: 'শেষের পাতা-এর গ্রাহকদের ব্যক্তিগত তথ্যের সুরক্ষা ও গোপনীয়তা রক্ষার নীতিমালা।',
  alternates: {
    canonical: 'https://shesherpata.com/privacy',
  },
  openGraph: {
    title: 'গোপনীয়তা নীতি — শেষের পাতা',
    description: 'গ্রাহকদের তথ্যের সুরক্ষা ও গোপনীয়তা রক্ষার নীতিমালা।',
    url: 'https://shesherpata.com/privacy',
    siteName: 'শেষের পাতা | Shesher Pata',
    images: [{ url: 'https://shesherpata.com/og-image.png', width: 1200, height: 630, alt: 'গোপনীয়তা নীতি — শেষের পাতা' }],
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
