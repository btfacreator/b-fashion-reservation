import './globals.css';
import type { Metadata } from 'next';
import { Cormorant_Garamond } from 'next/font/google';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
const SITE_NAME = process.env.SITE_NAME || 'B.Fashion ShowRoom';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} 예약`,
    template: `%s | ${SITE_NAME}`,
  },
  description: '부산섬유패션산업연합회 B.Fashion ShowRoom 방문 예약 시스템',
  keywords: ['B.Fashion', 'ShowRoom', '부산섬유패션산업연합회', '예약', '방문'],
  openGraph: {
    title: `${SITE_NAME} 예약`,
    description: '부산섬유패션산업연합회 B.Fashion ShowRoom 방문 예약',
    type: 'website',
    locale: 'ko_KR',
    siteName: SITE_NAME,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={cormorant.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="bg-white text-slate-900">{children}</body>
    </html>
  );
}
