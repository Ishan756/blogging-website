import './globals.css';
import type { Metadata } from 'next/';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/auth-provider';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TrendWise - AI-Powered SEO Blog Platform',
  description: 'Discover trending topics and AI-generated content optimized for search engines',
  keywords: 'blog, SEO, trending topics, AI content, technology news',
  authors: [{ name: 'TrendWise Team' }],
  creator: 'TrendWise',
  publisher: 'TrendWise',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.SITE_URL || 'http://localhost:3000',
    siteName: 'TrendWise',
    title: 'TrendWise - AI-Powered SEO Blog Platform',
    description: 'Discover trending topics and AI-generated content optimized for search engines',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'TrendWise Blog Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TrendWise - AI-Powered SEO Blog Platform',
    description: 'Discover trending topics and AI-generated content optimized for search engines',
    images: ['/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href={process.env.SITE_URL || 'http://localhost:3000'} />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}