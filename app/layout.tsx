import type { Metadata } from 'next';
import './globals.css';
import { SpeedInsights } from '@vercel/speed-insights/next';

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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","wbprl8tbts");`,
          }}
        />
      </head>
      <body>{children}<SpeedInsights /></body>
    </html>
  );
}
