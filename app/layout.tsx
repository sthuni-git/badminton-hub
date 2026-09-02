import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: '배드민턴 허브 | 전국 배드민턴 대회를 한눈에',
  description: '전국 9대 플랫폼의 700+건 배드민턴 대회 일정과 온라인 접수 정보를 한눈에 모아보세요.',
  openGraph: {
    title: '배드민턴 허브 (BadmintonHub)',
    description: '전국 배드민턴 대회 일정을 한눈에',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '배드민턴 허브 — 전국 배드민턴 대회를 한눈에' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '배드민턴 허브 (BadmintonHub)',
    description: '전국 배드민턴 대회 일정을 한눈에',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
