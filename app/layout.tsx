import type { Metadata } from 'next';
import './globals.css';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'Senthil Velan Driving School – Cuddalore',
  description: 'Learn to drive safely with Senthil Velan Driving School in Cuddalore, Tamil Nadu. Expert instructors, flexible timings, LLR & license assistance.',
  keywords: 'driving school cuddalore, driving classes cuddalore, learn driving cuddalore, LLR cuddalore, driving license cuddalore, Senthil Velan',
  openGraph: {
    title: 'Senthil Velan Driving School – Cuddalore',
    description: 'Expert driving training in Cuddalore, Tamil Nadu. Car & bike classes, LLR assistance.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚗</text></svg>" />
      </head>
      <body>{children}<Analytics /><SpeedInsights /></body>
    </html>
  );
}
