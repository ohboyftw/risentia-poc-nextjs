import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Risentia Trial Matching',
  description: 'AI-powered clinical trial matching with LangGraph orchestration',
  keywords: ['clinical trials', 'AI', 'healthcare', 'oncology', 'trial matching'],
  authors: [{ name: 'Risentia', url: 'https://risentia.com' }],
  openGraph: {
    title: 'Risentia Trial Matching',
    description: 'AI-powered clinical trial matching with LangGraph orchestration',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <TooltipProvider delayDuration={200}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
