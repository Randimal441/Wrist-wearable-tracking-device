import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
