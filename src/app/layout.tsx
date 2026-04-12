import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ThemeToggle from './theme-toggle';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CheckDeal — Real Estate Investment Analyzer',
  description: 'Analyze real estate deals with AI-powered insights, Brazilian tax calculations, and market comparisons.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CheckDeal',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
        <ThemeToggle />
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js');
              });
            }
          `
        }} />
      </body>
    </html>
  );
}
