import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'যোগাযোগ — শেষের পাতা | Contact Shesher Pata',
  description: 'আমাদের সাথে যোগাযোগ করুন। যেকোনো বইয়ের অনুসন্ধান, বিশেষ অর্ডার অথবা সহযোগিতার জন্য আমাদের সাথে সরাসরি যোগাযোগ করুন।',
  alternates: {
    canonical: 'https://shesherpata.com/contact',
  },
  openGraph: {
    title: 'যোগাযোগ — শেষের পাতা',
    description: 'যেকোনো বইয়ের অনুসন্ধান ও সহযোগিতার জন্য শেষের পাতা-এর সাথে যোগাযোগ করুন।',
    url: 'https://shesherpata.com/contact',
    siteName: 'শেষের পাতা | Shesher Pata',
    locale: 'bn_BD',
    type: 'website',
    images: [
      {
        url: 'https://shesherpata.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'যোগাযোগ — শেষের পাতা',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'যোগাযোগ — শেষের পাতা',
    description: 'যেকোনো বইয়ের অনুসন্ধান ও সহযোগিতার জন্য যোগাযোগ করুন।',
    images: ['https://shesherpata.com/og-image.png'],
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
