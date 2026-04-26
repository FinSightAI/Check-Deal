import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import ThemeToggle from './theme-toggle';

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

function WizeBar() {
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,height:36,zIndex:99999,background:'rgba(5,6,15,0.96)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',fontFamily:'Inter,-apple-system,sans-serif',boxSizing:'border-box',direction:'ltr'}}>
      <a href="https://finsightai.github.io/wizelife/dashboard.html" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none',lineHeight:1}}>
        <svg width="20" height="20" viewBox="0 0 100 100" style={{flexShrink:0}}><defs><linearGradient id="wlbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#wlbg)"/><text x="50" y="72" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="58" fill="white">W</text></svg>
        <span style={{fontSize:13,fontWeight:700,color:'#eef2ff',letterSpacing:'-0.3px'}}>WizeLife</span>
        <span style={{fontSize:11,fontWeight:600,color:'#8b5cf6',background:'rgba(139,92,246,0.12)',padding:'2px 8px',borderRadius:99,lineHeight:1.4}}>WizeDeal</span>
      </a>
      <a href="https://finsightai.github.io/wizelife/dashboard.html" style={{fontSize:12,color:'#7b88ad',textDecoration:'none',fontWeight:500,whiteSpace:'nowrap'}}>← All Tools</a>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className} style={{paddingTop:36}}>
        <WizeBar />
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
