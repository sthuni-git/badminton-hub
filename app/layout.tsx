import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: '민턴파인더 | 배드민턴 대회를 한눈에',
  description: '전국 배드민턴 대회 일정과 접수 정보를 빠르게 찾아보세요.',
  openGraph: {
    title: '민턴파인더',
    description: '배드민턴 대회를 한눈에',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '민턴파인더 — 배드민턴 대회를 한눈에' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '민턴파인더',
    description: '배드민턴 대회를 한눈에',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
