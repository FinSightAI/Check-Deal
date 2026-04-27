import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import ThemeToggle from './theme-toggle';
import { WizeBar, WizeOnboarding } from './wize-ui';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WizeDeal — Real Estate Investment Analyzer',
  description: 'Analyze real estate deals with AI-powered insights, tax calculations, and market comparisons. Part of WizeLife.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WizeDeal',
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
      <body className={inter.className} style={{paddingTop:36}}>
        <WizeBar />
        <WizeOnboarding />
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-6E5BE86WVT" strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-6E5BE86WVT');
        `}</Script>
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
