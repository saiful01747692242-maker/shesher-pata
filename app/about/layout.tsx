import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'আমাদের সম্পর্কে — শেষের পাতা | Shesher Pata',
  description: 'জানুন শেষের পাতা সম্পর্কে — বাংলাদেশের বিশ্বস্ত অনলাইন বইয়ের প্ল্যাটফর্ম। দেশি-বিদেশি অমর সাহিত্যকর্ম সরাসরি আপনার ঠিকানায়।',
  alternates: {
    canonical: 'https://shesherpata.com/about',
  },
  openGraph: {
    title: 'আমাদের সম্পর্কে — শেষের পাতা',
    description: 'জানুন শেষের পাতা সম্পর্কে — বাংলাদেশের বিশ্বস্ত অনলাইন বইয়ের প্ল্যাটফর্ম।',
    url: 'https://shesherpata.com/about',
    siteName: 'শেষের পাতা | Shesher Pata',
    locale: 'bn_BD',
    type: 'website',
    images: [
      {
        url: 'https://shesherpata.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'আমাদের সম্পর্কে — শেষের পাতা',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'আমাদের সম্পর্কে — শেষের পাতা',
    description: 'জানুন শেষের পাতা সম্পর্কে — বাংলাদেশের বিশ্বস্ত অনলাইন বইয়ের প্ল্যাটফর্ম।',
    images: ['https://shesherpata.com/og-image.png'],
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
