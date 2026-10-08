import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from './context/ThemeContext';

export const metadata: Metadata = {
  title: 'WristTrack — Wearable Tracking System',
  description:
    'Research-grade wrist-wearable IoT tracking device dashboard. Monitor your health metrics in real time.',
  keywords: ['wrist tracker', 'IoT', 'health monitoring', 'wearable device'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Blocking script: sets data-theme before first paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('wristtrack-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="h-full antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

