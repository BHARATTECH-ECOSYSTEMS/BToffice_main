import type { Metadata } from 'next'
import './globals.css'
import PreviewBanner from '@/components/PreviewBanner'
import AdminModeDetector from '@/components/AdminModeDetector'

export const metadata: Metadata = {
  title: 'Interview Tool',
  description: 'AI-powered qualitative research interview platform',
  icons: {
    icon: '/web-logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans antialiased">

        <PreviewBanner />

        <AdminModeDetector />

        {children}

      </body>
    </html>
  );
}