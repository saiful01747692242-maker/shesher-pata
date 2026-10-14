import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'সাহায্য ও সাধারণ জিজ্ঞাসা — শেষের পাতা | Shesher Pata Help',
  description: 'বই অর্ডার, পেমেন্ট, ক্যাশ অন ডেলিভারি, পার্সেল ট্র্যাকিং ও কুপন সংক্রান্ত যাবতীয় প্রশ্নের উত্তর ও সহায়তা।',
  alternates: {
    canonical: 'https://shesherpata.com/help',
  },
  openGraph: {
    title: 'সাহায্য ও সাধারণ জিজ্ঞাসা — শেষের পাতা',
    description: 'বই অর্ডার, পেমেন্ট, ডেলিভারি ও ট্র্যাকিং সংক্রান্ত তথ্যাবলী।',
    url: 'https://shesherpata.com/help',
    siteName: 'শেষের পাতা | Shesher Pata',
    locale: 'bn_BD',
    type: 'website',
    images: [
      {
        url: 'https://shesherpata.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'সাহায্য ও সাধারণ জিজ্ঞাসা — শেষের পাতা',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'সাহায্য ও সাধারণ জিজ্ঞাসা — শেষের পাতা',
    description: 'বই অর্ডার, ডেলিভারি ও ট্র্যাকিং সংক্রান্ত তথ্যাবলী।',
    images: ['https://shesherpata.com/og-image.png'],
  },
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
