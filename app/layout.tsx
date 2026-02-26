import type { Metadata } from 'next';
import { Cormorant_Garamond, Lobster_Two, Manrope } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'StrayLink',
  description: 'Stray and urban wildlife reporting platform',
};

const bodyFont = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
});

const displayFont = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700'],
});

const logoFont = Lobster_Two({
  subsets: ['latin'],
  variable: '--font-logo',
  weight: ['700'],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable} ${logoFont.variable} font-[var(--font-body)]`}>
        <div className="app-shell">
          <Navbar />
          <main className="container-shell py-9">{children}</main>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '14px',
              border: '1px solid #d8bf90',
              background: '#fffaf2',
              color: '#342311',
              boxShadow: '0 12px 28px rgba(77, 52, 26, 0.2)',
            },
          }}
        />
      </body>
    </html>
  );
}
